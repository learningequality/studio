from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("contentcuration", "0162_rename_channelversion_audit_fields"),
    ]

    operations = [
        migrations.RenameField(
            model_name="channelversion",
            old_name="non_distributable_included_licenses",
            new_name="non_distributable_licenses_included",
        ),
        migrations.RenameField(
            model_name="channelversion",
            old_name="included_special_permissions",
            new_name="special_permissions_included",
        ),
    ]
