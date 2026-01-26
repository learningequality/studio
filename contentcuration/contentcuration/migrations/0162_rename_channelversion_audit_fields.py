from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("contentcuration", "0161_update_channelversion_choices"),
    ]

    operations = [
        migrations.RenameField(
            model_name="channelversion",
            old_name="non_distributable_licenses_included",
            new_name="non_distributable_included_licenses",
        ),
        migrations.RenameField(
            model_name="channelversion",
            old_name="special_permissions_included",
            new_name="included_special_permissions",
        ),
    ]
