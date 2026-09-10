import { Request, Response } from "express";
import { prisma } from "@repo/db";
import {
  SalesOrderStatus,
  MovementType,
  AllocationStatus,
  StockStatus,
} from "@prisma/client";
import {
  handleError,
  handleValidationError,
  handleNotFoundError,
} from "../utils/errorHandler.js";

const VALID_TRANSITIONS: Partial<Record<SalesOrderStatus, SalesOrderStatus[]>> = {
  DRAFT: [SalesOrderStatus.PENDING_APPROVAL, SalesOrderStatus.CANCELLED],
  PENDING_APPROVAL: [SalesOrderStatus.APPROVED, SalesOrderStatus.CANCELLED],
  APPROVED: [SalesOrderStatus.IN_FULFILLMENT, SalesOrderStatus.ON_HOLD, SalesOrderStatus.CANCELLED],
  IN_FULFILLMENT: [SalesOrderStatus.ON_HOLD, SalesOrderStatus.CANCELLED],
  ON_HOLD: [SalesOrderStatus.APPROVED, SalesOrderStatus.CANCELLED],
  SHIPPED: [SalesOrderStatus.DELIVERED],
};

function computeStockStatus(qty: number, minStockQty: number): StockStatus {
  if (qty <= 0) return StockStatus.OUT_OF_STOCK;
  if (qty < minStockQty) return StockStatus.CRITICAL;
  if (qty < minStockQty * 1.5) return StockStatus.LOW;
  return StockStatus.HEALTHY;
}

export class KptOrderController {
  private parseId(
    id: string | undefined,
    res: Response,
    label: string,
    operation: string
  ): number | null {
    if (!id) {
      handleValidationError(res, `${label} is required`, "id", operation);
      return null;
    }
    const parsed = parseInt(id, 10);
    if (isNaN(parsed)) {
      handleValidationError(res, `Invalid ${label}`, "id", operation);
      return null;
    }
    return parsed;
  }

  /**
   * GET /api/kpt/orders
   * Paginated list with filters: status, channelPartnerId, dateFrom, dateTo, region, search
   */
  async listOrders(req: Request, res: Response) {
    const operation = "List KPT Orders";
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;

      const { status, channelPartnerId, dateFrom, dateTo, region, search } = req.query as Record<string, string>;

      const where: any = {};

      if (status) where.status = status as SalesOrderStatus;

      if (channelPartnerId) {
        const pid = parseInt(channelPartnerId, 10);
        if (!isNaN(pid)) where.channelPartnerId = pid;
      }

      if (dateFrom || dateTo) {
        where.orderDate = {};
        if (dateFrom) where.orderDate.gte = new Date(dateFrom);
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          where.orderDate.lte = end;
        }
      }

      if (region) {
        where.channelPartner = { region: region as any };
      }

      if (search) {
        where.OR = [
          { orderNumber: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
          { channelPartner: { name: { contains: search, mode: "insensitive" } } },
          { account: { name: { contains: search, mode: "insensitive" } } },
        ];
      }

      const [totalItems, orders] = await Promise.all([
        prisma.salesOrder.count({ where }),
        prisma.salesOrder.findMany({
          where,
          skip,
          take: limit,
          orderBy: { orderDate: "desc" },
          select: {
            id: true,
            orderNumber: true,
            name: true,
            status: true,
            paymentStatus: true,
            grandTotal: true,
            orderDate: true,
            expectedDeliveryDate: true,
            createdAt: true,
            channelPartner: {
              select: { id: true, name: true, type: true, region: true },
            },
            quote: {
              select: { id: true, quoteNumber: true },
            },
            account: {
              select: { id: true, name: true },
            },
            _count: {
              select: { lineItems: true },
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalItems / limit);

      return res.json({
        data: orders,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      });
    } catch (error) {
      handleError(error, res, operation);
    }
  }

  /**
   * GET /api/kpt/orders/:id
   * Full order detail including line items, stock allocations, payment info
   */
  async getOrderDetail(req: Request, res: Response) {
    const operation = "Get KPT Order Detail";
    try {
      const orderId = this.parseId(req.params.id, res, "Order ID", operation);
      if (orderId === null) return;

      const order = await prisma.salesOrder.findUnique({
        where: { id: orderId },
        include: {
          lineItems: {
            orderBy: { sortOrder: "asc" },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  inventoryItem: {
                    select: { id: true, sku: true, totalQty: true, stockStatus: true },
                  },
                },
              },
              stockAllocations: {
                where: { status: { not: AllocationStatus.CANCELLED } },
                select: {
                  id: true,
                  allocatedQty: true,
                  dispatchedQty: true,
                  status: true,
                  inventoryItem: {
                    select: { id: true, sku: true, totalQty: true },
                  },
                },
              },
            },
          },
          quote: {
            select: {
              id: true,
              quoteNumber: true,
              status: true,
              opportunity: { select: { id: true, name: true } },
            },
          },
          account: { select: { id: true, name: true } },
          contact: { select: { id: true, name: true, email: true, phone: true } },
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
          channelPartner: {
            select: {
              id: true,
              name: true,
              type: true,
              tier: true,
              region: true,
              contactName: true,
              contactEmail: true,
              contactPhone: true,
            },
          },
          financeInvoices: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              totalAmount: true,
              paidAmount: true,
              dueDate: true,
            },
            orderBy: { invoiceDate: "desc" },
            take: 5,
          },
        },
      });

      if (!order) return handleNotFoundError(res, "Sales Order", operation);

      return res.json({ data: order });
    } catch (error) {
      handleError(error, res, operation);
    }
  }

  /**
   * GET /api/kpt/orders/:id/stock-check
   * Check available inventory per line item SKU
   */
  async checkStockAvailability(req: Request, res: Response) {
    const operation = "Check Stock Availability";
    try {
      const orderId = this.parseId(req.params.id, res, "Order ID", operation);
      if (orderId === null) return;

      const order = await prisma.salesOrder.findUnique({
        where: { id: orderId },
        include: {
          lineItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  inventoryItem: true,
                },
              },
              stockAllocations: {
                where: { status: AllocationStatus.RESERVED },
                select: { allocatedQty: true },
              },
            },
          },
        },
      });

      if (!order) return handleNotFoundError(res, "Sales Order", operation);

      const results = order.lineItems.map((item) => {
        const inventoryItem = item.product.inventoryItem;
        const alreadyAllocated = item.stockAllocations.reduce(
          (sum, a) => sum + a.allocatedQty,
          0
        );

        if (!inventoryItem) {
          return {
            lineItemId: item.id,
            productId: item.productId,
            productName: item.product.name,
            productCode: item.product.code,
            orderedQty: item.quantity,
            availableQty: null,
            alreadyAllocated,
            shortage: null,
            hasInventoryLink: false,
            canAllocate: false,
            inventoryItemId: null,
            sku: null,
          };
        }

        const available = inventoryItem.totalQty;
        const needed = item.quantity - alreadyAllocated;
        const shortage = Math.max(0, needed - available);

        return {
          lineItemId: item.id,
          productId: item.productId,
          productName: item.product.name,
          productCode: item.product.code,
          orderedQty: item.quantity,
          availableQty: available,
          alreadyAllocated,
          shortage,
          hasInventoryLink: true,
          canAllocate: needed > 0 && available >= needed,
          inventoryItemId: inventoryItem.id,
          sku: inventoryItem.sku,
        };
      });

      const allAllocatable = results.every((r) => r.canAllocate || r.alreadyAllocated >= r.orderedQty);

      return res.json({
        data: {
          orderId,
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          allAllocatable,
          items: results,
        },
      });
    } catch (error) {
      handleError(error, res, operation);
    }
  }

  /**
   * PATCH /api/kpt/orders/:id/status
   * Validated status transition (SHIPPED transition blocked — use /dispatch instead)
   */
  async updateStatus(req: Request, res: Response) {
    const operation = "Update Order Status";
    try {
      const orderId = this.parseId(req.params.id, res, "Order ID", operation);
      if (orderId === null) return;

      const { status, cancellationReason } = req.body as {
        status: SalesOrderStatus;
        cancellationReason?: string;
      };

      if (!status) {
        return handleValidationError(res, "status is required", "status", operation);
      }

      if (status === SalesOrderStatus.SHIPPED) {
        return handleValidationError(
          res,
          "Use POST /dispatch to ship an order",
          "status",
          operation
        );
      }

      const order = await prisma.salesOrder.findUnique({ where: { id: orderId } });
      if (!order) return handleNotFoundError(res, "Sales Order", operation);

      const allowed = VALID_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(status)) {
        return handleValidationError(
          res,
          `Cannot transition from ${order.status} to ${status}`,
          "status",
          operation
        );
      }

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === SalesOrderStatus.CANCELLED) {
        updateData.cancelledAt = new Date();
        if (cancellationReason) updateData.cancellationReason = cancellationReason;

        // Cancel any reserved stock allocations and release inventory
        const reservedAllocations = await prisma.stockOrderAllocation.findMany({
          where: { salesOrderId: orderId, status: AllocationStatus.RESERVED },
        });

        await prisma.$transaction(async (tx) => {
          for (const alloc of reservedAllocations) {
            await tx.inventoryItem.update({
              where: { id: alloc.inventoryItemId },
              data: { totalQty: { increment: alloc.allocatedQty } },
            });
            await tx.stockOrderAllocation.update({
              where: { id: alloc.id },
              data: { status: AllocationStatus.CANCELLED },
            });
          }
          await tx.salesOrder.update({ where: { id: orderId }, data: updateData });
        });
      } else if (status === SalesOrderStatus.APPROVED) {
        updateData.approvedAt = new Date();
        await prisma.salesOrder.update({ where: { id: orderId }, data: updateData });
      } else {
        await prisma.salesOrder.update({ where: { id: orderId }, data: updateData });
      }

      const updated = await prisma.salesOrder.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          cancelledAt: true,
          cancellationReason: true,
          approvedAt: true,
          updatedAt: true,
        },
      });

      return res.json({ data: updated, message: `Order status updated to ${status}` });
    } catch (error) {
      handleError(error, res, operation);
    }
  }

  /**
   * POST /api/kpt/orders/:id/allocate-stock
   * Reserve warehouse stock for each line item that has a linked InventoryItem.
   * Moves order to IN_FULFILLMENT. Reports shortages without blocking.
   */
  async allocateStock(req: Request, res: Response) {
    const operation = "Allocate Stock";
    try {
      const orderId = this.parseId(req.params.id, res, "Order ID", operation);
      if (orderId === null) return;

      const order = await prisma.salesOrder.findUnique({
        where: { id: orderId },
        include: {
          lineItems: {
            include: {
              product: { include: { inventoryItem: true } },
              stockAllocations: { where: { status: AllocationStatus.RESERVED } },
            },
          },
        },
      });

      if (!order) return handleNotFoundError(res, "Sales Order", operation);

      const allowedStatuses: SalesOrderStatus[] = [
        SalesOrderStatus.APPROVED,
        SalesOrderStatus.IN_FULFILLMENT,
      ];
      if (!allowedStatuses.includes(order.status)) {
        return handleValidationError(
          res,
          `Order must be APPROVED or IN_FULFILLMENT to allocate stock (current: ${order.status})`,
          "status",
          operation
        );
      }

      const allocated: any[] = [];
      const shortages: any[] = [];
      const skipped: any[] = [];

      await prisma.$transaction(async (tx) => {
        for (const item of order.lineItems) {
          const inventoryItem = item.product.inventoryItem;

          if (!inventoryItem) {
            skipped.push({
              lineItemId: item.id,
              productName: item.product.name,
              reason: "No inventory item linked to product",
            });
            continue;
          }

          const existingAlloc = item.stockAllocations.find(
            (a) => a.inventoryItemId === inventoryItem.id
          );
          const alreadyAllocated = existingAlloc?.allocatedQty ?? 0;
          const needed = item.quantity - alreadyAllocated;

          if (needed <= 0) {
            allocated.push({
              lineItemId: item.id,
              productName: item.product.name,
              sku: inventoryItem.sku,
              allocatedQty: alreadyAllocated,
              message: "Already fully allocated",
            });
            continue;
          }

          const freshItem = await tx.inventoryItem.findUnique({
            where: { id: inventoryItem.id },
          });
          if (!freshItem) continue;

          if (freshItem.totalQty < needed) {
            shortages.push({
              lineItemId: item.id,
              productName: item.product.name,
              sku: inventoryItem.sku,
              orderedQty: item.quantity,
              alreadyAllocated,
              availableQty: freshItem.totalQty,
              shortfall: needed - freshItem.totalQty,
            });
            continue;
          }

          // Reserve: reduce inventory and create/update allocation
          const newQty = freshItem.totalQty - needed;
          await tx.inventoryItem.update({
            where: { id: inventoryItem.id },
            data: {
              totalQty: newQty,
              stockStatus: computeStockStatus(newQty, freshItem.minStockQty),
              lastUpdated: new Date(),
            },
          });

          if (existingAlloc) {
            await tx.stockOrderAllocation.update({
              where: { id: existingAlloc.id },
              data: { allocatedQty: item.quantity, updatedAt: new Date() },
            });
          } else {
            await tx.stockOrderAllocation.create({
              data: {
                salesOrderId: orderId,
                lineItemId: item.id,
                inventoryItemId: inventoryItem.id,
                allocatedQty: needed,
                dispatchedQty: 0,
                status: AllocationStatus.RESERVED,
              },
            });
          }

          allocated.push({
            lineItemId: item.id,
            productName: item.product.name,
            sku: inventoryItem.sku,
            allocatedQty: needed,
            remainingWarehouseQty: newQty,
          });
        }

        // Move order to IN_FULFILLMENT
        if (order.status === SalesOrderStatus.APPROVED) {
          await tx.salesOrder.update({
            where: { id: orderId },
            data: { status: SalesOrderStatus.IN_FULFILLMENT },
          });
        }
      });

      return res.json({
        data: { orderId, allocated, shortages, skipped },
        message: `Stock allocated. ${allocated.length} items reserved, ${shortages.length} shortages, ${skipped.length} skipped.`,
      });
    } catch (error) {
      handleError(error, res, operation);
    }
  }

  /**
   * POST /api/kpt/orders/:id/dispatch
   * Create StockMovement records, update partner StockEntry, mark order SHIPPED.
   * Requires: order IN_FULFILLMENT + channelPartnerId + at least one RESERVED allocation.
   * Body: { dispatchReference?: string }
   */
  async dispatchOrder(req: Request, res: Response) {
    const operation = "Dispatch Order";
    try {
      const orderId = this.parseId(req.params.id, res, "Order ID", operation);
      if (orderId === null) return;

      const { dispatchReference } = req.body as { dispatchReference?: string };

      const order = await prisma.salesOrder.findUnique({
        where: { id: orderId },
        include: {
          stockAllocations: {
            where: { status: AllocationStatus.RESERVED },
            include: { inventoryItem: true },
          },
        },
      });

      if (!order) return handleNotFoundError(res, "Sales Order", operation);

      if (order.status !== SalesOrderStatus.IN_FULFILLMENT) {
        return handleValidationError(
          res,
          `Order must be IN_FULFILLMENT to dispatch (current: ${order.status})`,
          "status",
          operation
        );
      }

      if (!order.channelPartnerId) {
        return handleValidationError(
          res,
          "Order must have a Channel Partner assigned before dispatch",
          "channelPartnerId",
          operation
        );
      }

      if (order.stockAllocations.length === 0) {
        return handleValidationError(
          res,
          "No stock allocations found. Allocate stock before dispatching.",
          "allocations",
          operation
        );
      }

      const userId = (req as any).user?.id ?? null;

      await prisma.$transaction(async (tx) => {
        for (const alloc of order.stockAllocations) {
          const invItem = alloc.inventoryItem;
          const qtyBefore = invItem.totalQty;
          const qtyAfter = qtyBefore;

          // Create StockMovement (warehouse out)
          await tx.stockMovement.create({
            data: {
              inventoryItemId: invItem.id,
              partnerId: order.channelPartnerId,
              movementType: MovementType.DISPATCH,
              quantity: alloc.allocatedQty,
              qtyBefore,
              qtyAfter,
              reference: dispatchReference ?? order.orderNumber,
              notes: `Dispatched for order ${order.orderNumber}`,
              createdBy: userId,
            },
          });

          // Update or create partner StockEntry
          const existingEntry = await tx.stockEntry.findFirst({
            where: {
              partnerId: order.channelPartnerId!,
              inventoryItemId: invItem.id,
            },
          });

          if (existingEntry) {
            const newStockQty = existingEntry.stockQty + alloc.allocatedQty;
            await tx.stockEntry.update({
              where: { id: existingEntry.id },
              data: {
                stockQty: newStockQty,
                stockStatus: computeStockStatus(newStockQty, existingEntry.minStockQty),
                lastUpdated: new Date(),
              },
            });
          } else {
            await tx.stockEntry.create({
              data: {
                partnerId: order.channelPartnerId!,
                inventoryItemId: invItem.id,
                productName: invItem.productName,
                sku: invItem.sku,
                category: invItem.category,
                stockQty: alloc.allocatedQty,
                minStockQty: invItem.minStockQty,
                reorderQty: invItem.reorderQty,
                unitPrice: invItem.unitPrice,
                stockStatus: computeStockStatus(alloc.allocatedQty, invItem.minStockQty),
                lastUpdated: new Date(),
              },
            });
          }

          // Mark allocation as dispatched
          await tx.stockOrderAllocation.update({
            where: { id: alloc.id },
            data: {
              status: AllocationStatus.DISPATCHED,
              dispatchedQty: alloc.allocatedQty,
              updatedAt: new Date(),
            },
          });
        }

        // Update order to SHIPPED
        await tx.salesOrder.update({
          where: { id: orderId },
          data: {
            status: SalesOrderStatus.SHIPPED,
            actualShipDate: new Date(),
            ...(dispatchReference ? { dispatchReference } : {}),
          },
        });
      });

      const updated = await prisma.salesOrder.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          actualShipDate: true,
          dispatchReference: true,
          channelPartnerId: true,
        },
      });

      return res.json({
        data: updated,
        message: `Order ${updated?.orderNumber} dispatched successfully`,
      });
    } catch (error) {
      handleError(error, res, operation);
    }
  }

  /**
   * POST /api/kpt/orders/:id/deliver
   * Mark a SHIPPED order as DELIVERED. Sets actualDeliveryDate.
   */
  async deliverOrder(req: Request, res: Response) {
    const operation = "Deliver Order";
    try {
      const orderId = this.parseId(req.params.id, res, "Order ID", operation);
      if (orderId === null) return;

      const order = await prisma.salesOrder.findUnique({ where: { id: orderId } });
      if (!order) return handleNotFoundError(res, "Sales Order", operation);

      if (order.status !== SalesOrderStatus.SHIPPED) {
        return handleValidationError(
          res,
          `Order must be SHIPPED to mark as delivered (current: ${order.status})`,
          "status",
          operation
        );
      }

      const updated = await prisma.salesOrder.update({
        where: { id: orderId },
        data: {
          status: SalesOrderStatus.DELIVERED,
          actualDeliveryDate: new Date(),
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          actualDeliveryDate: true,
        },
      });

      return res.json({
        data: updated,
        message: `Order ${updated.orderNumber} marked as delivered`,
      });
    } catch (error) {
      handleError(error, res, operation);
    }
  }

  /**
   * PATCH /api/kpt/orders/:id/payment-status
   * Update payment status (used by Finance when invoice is paid)
   */
  async updatePaymentStatus(req: Request, res: Response) {
    const operation = "Update Payment Status";
    try {
      const orderId = this.parseId(req.params.id, res, "Order ID", operation);
      if (orderId === null) return;

      const { paymentStatus } = req.body as { paymentStatus: string };
      if (!paymentStatus) {
        return handleValidationError(res, "paymentStatus is required", "paymentStatus", operation);
      }

      const valid = ["UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE"];
      if (!valid.includes(paymentStatus)) {
        return handleValidationError(res, `Invalid paymentStatus`, "paymentStatus", operation);
      }

      const order = await prisma.salesOrder.findUnique({ where: { id: orderId } });
      if (!order) return handleNotFoundError(res, "Sales Order", operation);

      const updated = await prisma.salesOrder.update({
        where: { id: orderId },
        data: { paymentStatus: paymentStatus as any },
        select: { id: true, orderNumber: true, paymentStatus: true },
      });

      return res.json({ data: updated });
    } catch (error) {
      handleError(error, res, operation);
    }
  }

  /**
   * PATCH /api/kpt/orders/:id/partner
   * Assign or reassign a channel partner to an existing order.
   * Required when an order was generated from a quote before the partner was known.
   */
  async assignPartner(req: Request, res: Response) {
    const operation = "Assign Partner to Order";
    try {
      const orderId = this.parseId(req.params.id, res, "Order ID", operation);
      if (orderId === null) return;

      const { channelPartnerId } = req.body as { channelPartnerId: number };
      if (!channelPartnerId) {
        return handleValidationError(res, "channelPartnerId is required", "channelPartnerId", operation);
      }

      const [order, partner] = await Promise.all([
        prisma.salesOrder.findUnique({ where: { id: orderId }, select: { id: true, status: true } }),
        prisma.channelPartner.findUnique({ where: { id: channelPartnerId }, select: { id: true, name: true } }),
      ]);

      if (!order) return handleNotFoundError(res, "Sales Order", operation);
      if (!partner) return handleNotFoundError(res, "Channel Partner", operation);

      const updated = await prisma.salesOrder.update({
        where: { id: orderId },
        data: { channelPartnerId },
        select: {
          id: true,
          orderNumber: true,
          channelPartnerId: true,
          channelPartner: { select: { id: true, name: true, type: true } },
        },
      });

      return res.json({ data: updated, message: `Partner "${partner.name}" assigned to order` });
    } catch (error) {
      handleError(error, res, operation);
    }
  }
}
