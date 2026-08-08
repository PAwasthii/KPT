"use client";

import * as React from "react";
import Link from "next/link";
import {
  DetailPageHeader,
  DetailCard,
  ActivityItem,
  LeadScore,
  QuickAction,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Button,
  Badge,
  
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabsContents,
  DeleteConfirmationDialog,
} from "@repo/ui";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@repo/ui/components/ui/select" 
import {
  ArrowLeft,
  Edit,
  Trash2,
  ArrowRightLeft,
  Mail,
  MessageCircle,
  Plus,
  User,
  Building2,
  ChevronDown,
  Phone,
  Globe,
  Clock,
  Calendar,
  Tag,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  useAnalyticsByLead,
  useCreateAnalyticsEvent,
} from "../hooks/useAnalytics";
import { useFormSubmissionsByLead } from "../hooks/useFormSubmissions";
import {
  useLead,
  useUpdateLead,
  useDeleteLead,
  useConvertLead,
} from "../hooks/useLeads";
import { useContact } from "../hooks/useContacts";
import { useUsers } from "../hooks/useUsers";
import { useAccount } from "../hooks/useAccounts";
import { Lead, Contact, Account } from "../lib/api/types";
import { formatAnalyticsDescription, formatAnalyticsTitle } from "../lib/analytics-events";
import EditLeadModal from "./EditLeadModal";
import { KeywordSelect } from "./keyword-select";
import { getLeadStatusConfig, getLeadSourceLabel } from "../lib/status-config";
import type { LeadSource } from "@prisma/client";
import type { LeadStatus as PrismaLeadStatus } from "@prisma/client";
import { validateEmail, validatePhone, validateName } from "../lib/validation";
import { getLeadFullName } from "../lib/name";
import { ActivityFeedSkeleton, DetailHeaderSkeleton, DetailSidebarSkeleton, SectionSkeleton, TableSkeleton } from "./skeletons";
import { displayPhone } from "../lib/phone-formatter";

interface LeadDetailPageProps {
  leadId: number;
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onConvert?: () => void;
  onSendEmail?: () => void;
  onSendWhatsApp?: () => void;
  onCreateAccount?: () => void;
  onLinkAccount?: () => void;
  onCreateContact?: () => void;
  onLinkContact?: () => void;
}

export function LeadDetailPage({
  leadId,
  onBack,
  onEdit,
  onDelete,
  onConvert,
  onSendEmail,
  onSendWhatsApp,
  onCreateAccount,
  onLinkAccount,
  onCreateContact,
  onLinkContact,
}: LeadDetailPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState("details");
  const [accountContactTab, setAccountContactTab] = React.useState("accounts");
  const [isEditing, setIsEditing] = React.useState(false);
  const [showConvertDialog, setShowConvertDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [convertData, setConvertData] = React.useState({
    keywordIds: [] as number[],
  });

  // API hooks - ALL hooks must be called in the same order every time
  const {
    data: lead,
    isLoading: leadLoading,
    error: leadError,
  } = useLead(leadId);
  const updateLeadMutation = useUpdateLead();
  const deleteLeadMutation = useDeleteLead();
  const convertLeadMutation = useConvertLead();

  // Fetch contact and account if lead is converted
  // Note: Account details are now included in the lead response from backend
  const contact = lead?.convertedToContact;
  const account = contact?.account;

  // Analytics hooks
  const { data: analyticsEvents = [], isLoading: analyticsLoading } =
    useAnalyticsByLead(leadId);
  const createAnalyticsEvent = useCreateAnalyticsEvent();
  const { data: formSubmissions = [], isLoading: submissionsLoading } =
    useFormSubmissionsByLead(leadId);

  // Local state for editing
  const [editedLead, setEditedLead] = React.useState<Partial<Lead>>({});
  const { data: usersResponse } = useUsers();
  const usersData = usersResponse?.data || [];

  // Update edited lead when lead data changes, but only if not currently editing
  React.useEffect(() => {
    if (lead && !isEditing) {
      setEditedLead(lead);
    }
  }, [lead, isEditing]);

  // Initialize edited lead when entering edit mode
  React.useEffect(() => {
    if (isEditing && lead) {
      setEditedLead(lead);
    }
  }, [isEditing, lead]);

  const formattedActivities = React.useMemo(() => {
    return analyticsEvents.map((event) => ({
      id: event.id,
      title: formatAnalyticsTitle(event.eventType),
      description: formatAnalyticsDescription(event),
      time: new Date(event.occurredAt).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    }));
  }, [analyticsEvents]);

  // All other hooks and state must be called before any early returns
  const handleCreateEvent = async (eventType: string, eventData: any) => {
    try {
      await createAnalyticsEvent.mutateAsync({
        leadId,
        eventType,
        eventData,
        campaignId: undefined,
        contactId: undefined,
      });
    } catch (error) {
      console.error("Failed to create analytics event:", error);
    }
  };

  const [showEditModal, setShowEditModal] = React.useState(false);
  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleSave = async () => {
    // Basic validation
    if (!editedLead.firstName?.trim()) {
      toast.error("Lead first name is required");
      return;
    }
    if (!editedLead.email?.trim()) {
      toast.error("Email is required");
      return;
    }
    // Validate fields before saving
    const firstNameValidation = validateName(editedLead.firstName || "");
    if (!firstNameValidation.isValid) {
      toast.error(firstNameValidation.error || "Invalid first name");
      return;
    }

    if (editedLead.lastName && editedLead.lastName.trim()) {
      const lastNameValidation = validateName(editedLead.lastName);
      if (!lastNameValidation.isValid) {
        toast.error(lastNameValidation.error || "Invalid last name");
        return;
      }
    }

    const trimmedLastName =
      editedLead.lastName && editedLead.lastName.trim().length > 0
        ? editedLead.lastName.trim()
        : null;

    const emailValidation = validateEmail(editedLead.email || "");
    if (!emailValidation.isValid) {
      toast.error(emailValidation.error || "Invalid email address");
      return;
    }

    const phoneValidation = validatePhone(editedLead.phone || "");
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.error || "Invalid phone number");
      return;
    }

    try {
      console.log("Attempting to update lead:", {
        leadId,
        data: editedLead,
        originalLead: lead,
      });

      // Ensure we have the required fields
      const updateData = {
        firstName: editedLead.firstName,
        lastName: trimmedLastName,
        email: editedLead.email,
        phone: editedLead.phone,
        companyName: editedLead.companyName,
        source: editedLead.source,
        status: editedLead.status,
        ownerId: (editedLead as any).ownerId ?? (lead as any)?.ownerId,
      };

      console.log("Sending update data:", updateData);

      const result = await updateLeadMutation.mutateAsync({
        id: leadId,
        data: updateData,
      });

      console.log("Lead update successful:", result);
      setIsEditing(false);
      toast.success("Lead updated successfully!");
      onEdit?.();
    } catch (error) {
      console.error("Failed to update lead - Full error details:", {
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        errorStack: error instanceof Error ? error.stack : "No stack trace",
        leadId,
        editedLead,
        originalLead: lead,
      });
      toast.error(
        `Failed to update lead: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (lead) {
      setEditedLead(lead); // Reset to original values
    }
  };

  const handleFieldChange = (field: keyof Lead, value: string) => {
    setEditedLead(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleConvert = () => {
    setShowConvertDialog(true);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleConvertConfirm = async () => {
    try {
      console.log("Converting lead:", { leadId, convertData });
      const result = await convertLeadMutation.mutateAsync({
        id: leadId,
        data: convertData,
      });
      console.log("Lead conversion successful:", result);
      setShowConvertDialog(false);
      toast.success("Lead converted to contact successfully!");
      onConvert?.();
    } catch (error) {
      console.error("Failed to convert lead:", error);
      toast.error(
        `Failed to convert lead: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteLeadMutation.mutateAsync(leadId);
      setShowDeleteDialog(false);
      toast.success("Lead deleted successfully!");
      onDelete?.();
      // Navigate away to prevent refetching a deleted lead (404)
      router.push("/leads/lead-master");
    } catch (error) {
      console.error("Failed to delete lead:", error);
      // Don't close the dialog on error so user can try again
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      // Check if it's a 404 error (lead already deleted)
      if (errorMessage.includes("404") || errorMessage.includes("not found")) {
        toast.error("Lead has already been deleted");
        setShowDeleteDialog(false);
        router.push("/leads/lead-master");
      } else {
        toast.error(`Failed to delete lead: ${errorMessage}`);
      }
    }
  };

  const handleSendEmail = () => {
    try {
      onSendEmail?.();
      toast.success("Email sent successfully!");
    } catch (error) {
      console.error("Failed to send email:", error);
      toast.error("Failed to send email. Please try again.");
    }
  };

  const handleSendWhatsApp = () => {
    try {
      onSendWhatsApp?.();
      toast.success("WhatsApp message sent successfully!");
    } catch (error) {
      console.error("Failed to send WhatsApp message:", error);
      toast.error("Failed to send WhatsApp message. Please try again.");
    }
  };

  const handleAccountClick = () => {
    if (account?.id) {
      router.push(`/accounts/${account.id}`);
    }
  };

  const handleContactClick = () => {
    if (contact?.id) {
      router.push(`/contacts/${contact.id}`);
    }
  };

  const getStatusVariant = (status: string) => {
    const normalized = String(
      status || ""
    ).toUpperCase() as unknown as PrismaLeadStatus;
    const config = getLeadStatusConfig(normalized);
    return config?.variant || "secondary";
  };

  const actions = React.useMemo(() => {
    const actionList = [];

    if (onConvert && !lead?.convertedToContactId) {
      actionList.push({
        label: convertLeadMutation.isPending ? "Converting..." : "Convert",
        icon: <ArrowRightLeft className="h-4 w-4" />,
        onClick: handleConvert,
        variant: "outline" as const,
        disabled: convertLeadMutation.isPending,
      });
    }

    if (onDelete) {
      actionList.push({
        label: deleteLeadMutation.isPending ? "Deleting..." : "Delete",
        icon: <Trash2 className="h-4 w-4" />,
        onClick: handleDelete,
        variant: "destructive" as const,
        disabled: deleteLeadMutation.isPending,
      });
    }

    return actionList;
  }, [
    lead?.status,
    lead?.convertedToContactId,
    onConvert,
    onEdit,
    onDelete,
    convertLeadMutation.isPending,
    deleteLeadMutation.isPending,
  ]);

  // Loading and error states - AFTER all hooks are called
  if (leadLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 space-y-6">
        <DetailHeaderSkeleton />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <SectionSkeleton>
              <TableSkeleton rows={4} />
            </SectionSkeleton>
            <SectionSkeleton>
              <TableSkeleton rows={3} />
            </SectionSkeleton>
            <ActivityFeedSkeleton items={4} />
          </div>
          <div className="space-y-6">
            <DetailSidebarSkeleton />
            <DetailSidebarSkeleton items={3} />
          </div>
        </div>
      </div>
    );
  }

  if (leadError || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load lead details</p>
          <Button onClick={onBack} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const currentFirstName =
    editedLead.firstName ?? lead?.firstName ?? "";
  const currentLastName =
    editedLead.lastName ?? lead?.lastName ?? "";
  const displayName = getLeadFullName(currentFirstName, currentLastName);

  // Get status with default to OPEN
  const currentStatus = editedLead.status || lead?.status || "OPEN";
  const statusConfig = getLeadStatusConfig(currentStatus as PrismaLeadStatus);
  const statusLabel = statusConfig?.label || "OPEN";
  const statusVariant = getStatusVariant(currentStatus);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* @ts-ignore */}
      <DetailPageHeader
        title={displayName}
        status={statusLabel}
        statusVariant={statusVariant}
        onBack={onBack}
        actions={actions}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lead Details Card */}
          {/* @ts-ignore */}
          <DetailCard
            title="Lead Details"
            headerActions={
              onEdit ? (
                <Button
                  variant="outline"
                  onClick={handleEdit}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" /> Edit
                </Button>
              ) : undefined
            }
            className="border shadow-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-pale-aqua">
                  <User className="h-3.5 w-3.5 text-brand-teal" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Lead Name</p>
                  <p className="text-sm font-medium text-gray-700">{displayName || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-pale-aqua">
                  <Building2 className="h-3.5 w-3.5 text-brand-teal" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Company</p>
                  <p className="text-sm font-medium text-gray-700">{lead?.companyName || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-pale-aqua">
                  <Mail className="h-3.5 w-3.5 text-brand-teal" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Email</p>
                  <p className="text-sm font-medium text-gray-700 truncate" title={lead?.email || "N/A"}>{lead?.email || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-pale-aqua">
                  <Phone className="h-3.5 w-3.5 text-brand-teal" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Phone</p>
                  <p className="text-sm font-medium text-gray-700">{displayPhone(lead?.phone, lead?.countryCode)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-pale-aqua">
                  <User className="h-3.5 w-3.5 text-brand-teal" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Assigned To</p>
                  <p className="text-sm font-medium text-gray-700">
                    {[lead?.owner?.firstName, lead?.owner?.lastName].filter(Boolean).join(' ') || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-pale-aqua">
                  <Calendar className="h-3.5 w-3.5 text-brand-teal" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Assigned On</p>
                  <p className="text-sm font-medium text-gray-700">
                    {lead?.assignedAt
                      ? new Date(lead.assignedAt).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true })
                      : "Not assigned yet"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-pale-aqua">
                  <Globe className="h-3.5 w-3.5 text-brand-teal" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Source</p>
                  <p className="text-sm font-medium text-gray-700">{lead?.source ? getLeadSourceLabel(lead.source) : "N/A"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-pale-aqua">
                  <Clock className="h-3.5 w-3.5 text-brand-teal" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Created At</p>
                  <p className="text-sm font-medium text-gray-700">
                    {lead?.createdAt ? new Date(lead.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </DetailCard>

          {/* Activity Timeline Card */}
          {/* @ts-ignore */}
          <DetailCard
            title="Activity Timeline"
            headerActions={
              <>
                <Select defaultValue="all" onValueChange={() => {}}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="recent">Recent</SelectItem>
                    <SelectItem value="emails">Emails</SelectItem>
                    <SelectItem value="calls">Calls</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
          >
            <div className="max-h-[400px] overflow-y-auto space-y-0">
              {analyticsLoading ? (
                <ActivityFeedSkeleton items={3} />
              ) : formattedActivities.length > 0 ? (
                formattedActivities.map((activity) => (
                  <React.Fragment key={activity.id}>
                    {/* @ts-ignore */}
                    <ActivityItem
                      title={activity.title}
                      description={activity.description}
                      time={activity.time}
                    />
                  </React.Fragment>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No activities recorded yet</p>
                </div>
              )}
            </div>
          </DetailCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account & Contact Card */}
          {/* @ts-ignore */}
          <Card>
            {/* @ts-ignore */}
            <CardHeader>
              <div className="flex items-center justify-center">
                {/* @ts-ignore */}
                <Tabs
                  value={accountContactTab}
                  onValueChange={setAccountContactTab}
                >
                  {/* @ts-ignore */}
                  <TabsList className="gap-16">
                    {/* @ts-ignore */}
                    <TabsTrigger value="accounts">Accounts</TabsTrigger>
                    {/* @ts-ignore */}
                    <TabsTrigger value="contacts">Contacts</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            {/* @ts-ignore */}
            <CardContent>
              <Tabs
                value={accountContactTab}
                onValueChange={setAccountContactTab}
              >
                {/* @ts-ignore */}
                <TabsContent value="accounts">
                  {lead?.convertedToContactId ? (
                    account ? (
                      <div className="space-y-3">
                        <Link
                          href={`/leads/accounts/${account.id}`}
                          prefetch={true}
                          className="flex items-center justify-between gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors block"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-brand-pale-aqua rounded-full flex items-center justify-center shrink-0">
                              <Building2 className="h-5 w-5 text-brand-teal" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-medium text-brand-teal hover:text-brand-indigo truncate">
                                {account.name || "N/A"}
                              </h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {account.industry || "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right min-w-0 max-w-[45%]">
                            <p className="text-sm truncate" title={account.website || "N/A"}>
                              {account.website || "N/A"}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {account.phone || "N/A"}
                            </p>
                            <p className="text-xs text-brand-teal mt-1">
                              Click to view details
                            </p>
                          </div>
                        </Link>
                        {/* Keywords Display */}
                        {lead?.keywords && lead.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {lead.keywords.map((leadKeyword) => (
                              <Badge
                                key={leadKeyword.id}
                                variant="secondary"
                                className="text-xs"
                              >
                                #{leadKeyword.keyword.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <Building2 className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="font-medium mb-2">No Account Linked</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          The converted contact is not associated with any
                          account.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="font-medium mb-2">Lead Not Converted</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        This lead has not been converted yet. Convert the lead
                        to create a contact and optionally link to an account.
                      </p>
                    </div>
                  )}
                </TabsContent>
                {/* @ts-ignore */}
                <TabsContent value="contacts">
                  {lead?.convertedToContactId ? (
                    contact ? (
                      <div className="space-y-3">
                        <Link
                          href={`/leads/contacts/${contact.id}`}
                          prefetch={true}
                          className="flex items-center justify-between gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors block"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-brand-pale-aqua rounded-full flex items-center justify-center shrink-0">
                              <User className="h-5 w-5 text-brand-indigo" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-medium text-brand-indigo hover:text-brand-teal truncate">
                                {contact.name || "N/A"}
                              </h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {contact.position || "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right min-w-0 max-w-[45%]">
                            <p className="text-sm truncate" title={contact.email || "N/A"}>{contact.email || "N/A"}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {displayPhone(contact.phone, contact.countryCode)}
                            </p>
                            <p className="text-xs text-brand-indigo mt-1">
                              Click to view details
                            </p>
                          </div>
                        </Link>
                        {/* Keywords Display */}
                        {lead?.keywords && lead.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {lead.keywords.map((leadKeyword) => (
                              <Badge
                                key={leadKeyword.id}
                                variant="secondary"
                                className="text-xs"
                              >
                                #{leadKeyword.keyword.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <User className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="font-medium mb-2">Contact Not Found</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          The converted contact could not be loaded.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="font-medium mb-2">Lead Not Converted</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        This lead has not been converted yet. Convert the lead
                        to create a contact.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Lead Score Card */}
          {/* @ts-ignore */}
          {/* <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead Score</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadScore
                score={lead.score}
                maxScore={100}
                description="High quality lead based on engagement"
              />
            </CardContent>
          </Card> */}

          {/* Quick Actions Card */}
          {/* @ts-ignore */}
          <Card>
            {/* @ts-ignore */}
            <CardHeader>
              {/* @ts-ignore */}
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            {/* @ts-ignore */}
            <CardContent className="space-y-2">
              {/* @ts-ignore */}
              <QuickAction
                icon={<Mail className="h-4 w-4" />}
                label="Send Email"
                onClick={handleSendEmail}
              />
              {/* @ts-ignore */}
              <QuickAction
                icon={<MessageCircle className="h-4 w-4" />}
                label="Send Whatsapp"
                onClick={handleSendWhatsApp}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enhanced Convert Dialog */}
      {showConvertDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">
              Convert Lead to Contact
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Convert "{displayName || "this lead"}" to a contact. You can
              optionally assign keywords.
            </p>
            <div className="space-y-4">
              <KeywordSelect
                selectedKeywordIds={convertData.keywordIds}
                onSelectionChange={(keywordIds) =>
                  setConvertData(prev => ({
                    ...prev,
                    keywordIds,
                  }))
                }
                label="Keyword"
                placeholder="Select or create keywords"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowConvertDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConvertConfirm}
                disabled={convertLeadMutation.isPending}
              >
                {convertLeadMutation.isPending
                  ? "Converting..."
                  : "Convert Lead"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteConfirm}
        itemName={displayName || "this lead"}
        itemType="lead"
        isLoading={deleteLeadMutation.isPending}
        disabled={deleteLeadMutation.isPending}
      />
      {/* Edit Lead Modal */}
      {lead && (
        <EditLeadModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          lead={lead as any}
          onUpdated={() => onEdit?.()}
        />
      )}
    </div>
  );
}

