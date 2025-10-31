# Generated manually to restore unique constraint
from django.db import migrations, models


def remove_duplicate_submissions(apps, schema_editor):
    """
    Remove duplicate submissions for the same channel and version.
    Keeps the most recent submission (by date_created) for each channel/version pair.
    """
    CommunityLibrarySubmission = apps.get_model(
        "contentcuration", "CommunityLibrarySubmission"
    )

    # Find duplicates: group by channel and channel_version
    from django.db.models import Max

    # Get the latest submission for each channel/version pair
    latest_submissions = (
        CommunityLibrarySubmission.objects.values("channel", "channel_version")
        .annotate(max_date=Max("date_created"))
        .values_list("channel", "channel_version", "max_date")
    )

    # For each channel/version pair, delete all but the latest
    for channel_id, channel_version, max_date in latest_submissions:
        CommunityLibrarySubmission.objects.filter(
            channel_id=channel_id, channel_version=channel_version
        ).exclude(date_created=max_date).delete()


def reverse_remove_duplicates(apps, schema_editor):
    # Cannot reverse data deletion, so this is a no-op
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("contentcuration", "0158_remove_unique_constraint_community_library_submission"),
    ]

    # Run each operation in its own transaction to avoid
    # "pending trigger events" when altering the table after deletes
    atomic = False

    operations = [
        migrations.RunPython(
            remove_duplicate_submissions, reverse_remove_duplicates
        ),
        migrations.AddConstraint(
            model_name="communitylibrarysubmission",
            constraint=models.UniqueConstraint(
                fields=["channel", "channel_version"],
                name="unique_channel_with_channel_version",
            ),
        ),
    ]

