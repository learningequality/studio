from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError

from contentcuration.constants.organization_roles import ORGANIZATION_ADMIN
from contentcuration.constants.organization_roles import ORGANIZATION_EDITOR
from contentcuration.constants.organization_roles import ORGANIZATION_ROLE_STATUS_ACTIVE
from contentcuration.models import Channel
from contentcuration.models import Invitation
from contentcuration.models import Organization
from contentcuration.models import OrganizationRole


def migration_organizations(user):
    queryset = Organization.objects.filter(deleted=False)
    if user.is_admin:
        return queryset
    return queryset.filter(
        user_roles__user=user,
        user_roles__role__in=(ORGANIZATION_ADMIN, ORGANIZATION_EDITOR),
        user_roles__status=ORGANIZATION_ROLE_STATUS_ACTIVE,
    ).distinct()


def pending_migrations(channel):
    return Invitation.objects.filter(
        channel=channel,
        organization__isnull=False,
        accepted=False,
        declined=False,
        revoked=False,
    )


def is_uncontested(channel, organization, user):
    if user.is_admin:
        return True
    members = OrganizationRole.objects.filter(
        organization=organization,
        role__in=(ORGANIZATION_ADMIN, ORGANIZATION_EDITOR),
        status=ORGANIZATION_ROLE_STATUS_ACTIVE,
    ).values_list("user_id", flat=True)
    return not channel.editors.exclude(id__in=members).exists()


def validate_migration(channel, organization, user, contested=False):
    # Callers recheck this while holding the channel lock: its organization
    # (and therefore the user's access) may have changed while waiting.
    if not Channel.filter_edit_queryset(
        Channel.objects.filter(pk=channel.pk), user
    ).exists():
        raise PermissionDenied("You cannot change this channel's organization.")
    if not migration_organizations(user).filter(id=organization.id).exists():
        raise PermissionDenied(
            "You must be an editor or administrator of the organization."
        )
    if pending_migrations(channel).exists():
        raise ValidationError(
            "Resolve the pending migration before changing organization."
        )
    if channel.organization_id == organization.id:
        raise ValidationError("Channel already belongs to this organization.")
    if not contested and not is_uncontested(channel, organization, user):
        raise ValidationError("This migration requires administrator approval.")
