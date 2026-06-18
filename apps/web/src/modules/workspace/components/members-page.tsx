"use client";

import { useTranslations } from "next-intl";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Users, UserPlus } from "lucide-react";
import {
  useWorkspaceMembers,
  type WorkspaceMemberData,
} from "../hooks/use-workspace-members";
import {
  ToastContainer,
  useToasts,
  SectionCard,
  MemberRow,
  InviteRow,
  InviteLinkSection,
  MembersLoadingSkeleton,
} from "./members-components";
import { InviteDialog, RemoveConfirmDialog } from "./members-dialogs";

interface MembersPageProps {
  workspaceId: string;
  currentUserId: string;
  currentUserRole: "owner" | "admin" | "member" | "viewer";
}

export function MembersPage({
  workspaceId,
  currentUserId,
  currentUserRole,
}: MembersPageProps) {
  const t = useTranslations("dashboard");
  const {
    members,
    invites,
    loading,
    error,
    inviteMember,
    removeMember,
    updateRole,
    revokeInvite,
    generateInviteLink,
  } = useWorkspaceMembers(workspaceId);

  const { toasts, addToast, dismissToast } = useToasts();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removingMember, setRemovingMember] =
    useState<WorkspaceMemberData | null>(null);

  const isAdmin =
    currentUserRole === "owner" || currentUserRole === "admin";

  if (loading) {
    return <MembersLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">{t("workspace.members.loadFailed")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <SectionCard
        title={t("workspace.members.membersTitle", { count: members.length })}
        description={t("workspace.members.membersDescription")}
        action={
          isAdmin ? (
            <button
              onClick={() => setInviteDialogOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <UserPlus className="h-4 w-4" />
              {t("workspace.members.invite")}
            </button>
          ) : undefined
        }
      >
        <div className="space-y-2">
          {members.map((member) => (
            <MemberRow
              key={member.user_id}
              member={member}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onUpdateRole={updateRole}
              onRemove={(m) => setRemovingMember(m)}
              addToast={addToast}
            />
          ))}
        </div>
      </SectionCard>

      {isAdmin && invites.length > 0 && (
        <SectionCard
          title={t("workspace.members.pendingTitle", { count: invites.length })}
          description={t("workspace.members.pendingDescription")}
        >
          <div className="space-y-2">
            {invites.map((invite) => (
              <InviteRow
                key={invite.id}
                invite={invite}
                onRevoke={revokeInvite}
                addToast={addToast}
              />
            ))}
          </div>
        </SectionCard>
      )}

      {isAdmin && (
        <SectionCard
          title={t("workspace.members.inviteLinkTitle")}
          description={t("workspace.members.inviteLinkDescription")}
        >
          <InviteLinkSection
            onGenerate={generateInviteLink}
            addToast={addToast}
          />
        </SectionCard>
      )}

      <InviteDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        onInvite={async (email, role) => {
          await inviteMember(email, role);
          addToast("success", t("workspace.members.inviteSent", { email }));
        }}
      />

      {removingMember && (
        <RemoveConfirmDialog
          member={removingMember}
          onClose={() => setRemovingMember(null)}
          onConfirm={async () => {
            const name =
              removingMember.display_name ||
              removingMember.email.split("@")[0];
            await removeMember(removingMember.user_id);
            addToast("success", t("workspace.members.memberRemoved", { name: name ?? removingMember.email }));
          }}
        />
      )}
    </div>
  );
}
