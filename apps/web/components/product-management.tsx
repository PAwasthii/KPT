"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@repo/ui/components/ui/button";
import {
  Card,
  CardContent,
} from "@repo/ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { Badge } from "@repo/ui/components/ui/badge";
import { SearchInput } from "@repo/ui/components/ui/search-input";
import { DataTable } from "./data-table";
import { ProductFilter, ProductFilterValues, hasActiveProductFilters } from "./product-filter";
import { ProductFilterBadges } from "./product-filter-badges";
import {
  productService,
  productCategoryService,
} from "@/lib/api/services";
import {
  Product,
  ProductCategory,
  CreateCategoryInput,
} from "@/lib/api/types";
import { toast } from "sonner";
import {
  Tag,
  Image as ImageIcon,
  Package,
  ArrowLeft,
} from "lucide-react";

import { ViewCategoriesModal } from "./ViewCategoriesModal";
import { useRouter } from "next/navigation";

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isViewCategoriesModalOpen, setIsViewCategoriesModalOpen] = useState(false);
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filters, setFilters] = useState<ProductFilterValues>({
    categoryId: undefined,
    active: undefined,
  });

  const [categoryForm, setCategoryForm] = useState<CreateCategoryInput>({
    name: "",
    description: "",
  });

  const fetchCategories = useCallback(async () => {
    try {
      const categoriesRes = await productCategoryService.getAllCategories();
      setCategories(categoriesRes.data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch categories");
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: {
        categoryId?: number;
        active?: boolean;
        search?: string;
      } = {};

      if (filters.categoryId !== undefined) {
        apiFilters.categoryId = filters.categoryId;
      }

      if (filters.active !== undefined) {
        apiFilters.active = filters.active;
      }

      if (searchQuery.trim()) {
        apiFilters.search = searchQuery.trim();
      }

      const productsRes = await productService.getAllProducts(apiFilters);
      setProducts(productsRes.data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData();
    }, searchQuery ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [fetchData]);

  const handleCreateCategory = async () => {
    try {
      if (!categoryForm.name) {
        toast.error("Category name is required");
        return;
      }

      await productCategoryService.createCategory(categoryForm);
      toast.success("Category created successfully");
      fetchCategories();
      fetchData();
      setCategoryForm({ name: "", description: "" });
      setIsCategoryModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create category");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Catalogue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Products are managed in Stock Inventory and synced here automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsViewCategoriesModalOpen(true)}
          >
            <Tag className="h-4 w-4 mr-2" />
            View Categories
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsCategoryModalOpen(true)}
          >
            <Tag className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <SearchInput
            placeholder="Search products by name, code, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {products.length === 0 && !hasActiveProductFilters(filters) ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No products found. Products are created and managed in Stock Inventory.</p>
          </CardContent>
        </Card>
      ) : (
        <DataTable<Product>
          data={products}
          columns={[
            {
              key: "imageUrl",
              label: "Image",
              render: (value, product) => (
                <div className="py-2">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "name",
              label: "Product Name",
              render: (value) => (
                <span className="font-medium text-muted-foreground py-4 text-center justify-center w-full pl-4">{value}</span>
              ),
            },
            {
              key: "code",
              label: "Code",
              render: (value) => (
                <span className="text-muted-foreground py-4 text-center justify-center w-full pl-4">{value}</span>
              ),
            },
            {
              key: "category",
              label: "Category",
              render: (value, product) => (
                <div className="py-4">
                  <Badge variant="outline" className="text-center justify-center px-2">
                    {product.category?.name || "N/A"}
                  </Badge>
                </div>
              ),
            },
            {
              key: "component",
              label: "Type",
              render: (value, product) => (
                <div className="py-4">
                  <Badge variant="secondary" className="text-center justify-center px-2">
                    {product.component ? "Component" : "Product"}
                  </Badge>
                </div>
              ),
            },
            {
              key: "active",
              label: "Status",
              render: (value, product) => (
                <div className="py-4 pl-4">
                  <Badge className="text-center justify-center px-2">
                    {product.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ),
            },
          ]}
          getRowHref={(product) => `/sales/products/${product.id}`}
          title="All Products"
          count={products.length}
          searchQuery={searchQuery}
          isSearchMode={!!searchQuery}
          showFilter={true}
          customFilter={
            <ProductFilter
              filters={filters}
              categories={categories}
              onCategoryChange={(categoryId) =>
                setFilters((prev) => ({ ...prev, categoryId }))
              }
              onActiveChange={(active) =>
                setFilters((prev) => ({ ...prev, active }))
              }
              onClearFilters={() =>
                setFilters({ categoryId: undefined, active: undefined })
              }
            />
          }
          filterBadges={
            <ProductFilterBadges
              filters={filters}
              categories={categories}
              onCategoryRemove={() =>
                setFilters((prev) => ({ ...prev, categoryId: undefined }))
              }
              onActiveRemove={() =>
                setFilters((prev) => ({ ...prev, active: undefined }))
              }
            />
          }
        />
      )}

      {/* Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>
              Add a new product category
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">
                Category Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="categoryName"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                placeholder="Enter category name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryDescription">Description</Label>
              <Textarea
                id="categoryDescription"
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    description: e.target.value,
                  })
                }
                placeholder="Enter category description"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCategoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCategory}>Create Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ViewCategoriesModal
        open={isViewCategoriesModalOpen}
        onOpenChange={setIsViewCategoriesModalOpen}
        categories={categories}
      />
    </div>
  );
}
