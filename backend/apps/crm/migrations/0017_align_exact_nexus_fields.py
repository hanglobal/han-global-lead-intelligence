from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0016_alter_lead_company_annual_revenue_clean_and_more'),
    ]

    operations = [
        # ── Lead Renames ───────────────────────────────────────────────────────
        migrations.RenameField(
            model_name='lead',
            old_name='name',
            new_name='company_name',
        ),
        migrations.RenameField(
            model_name='lead',
            old_name='website',
            new_name='company_website',
        ),
        migrations.RenameField(
            model_name='lead',
            old_name='category',
            new_name='industry',
        ),
        migrations.RenameField(
            model_name='lead',
            old_name='linkedin_url',
            new_name='company_linkedin',
        ),
        migrations.RenameField(
            model_name='lead',
            old_name='address',
            new_name='company_full_address',
        ),
        migrations.RenameField(
            model_name='lead',
            old_name='street_address',
            new_name='company_street_address',
        ),
        migrations.RenameField(
            model_name='lead',
            old_name='postal_code',
            new_name='company_postal_code',
        ),
        migrations.RenameField(
            model_name='lead',
            old_name='company_state',
            new_name='state',
        ),
        migrations.RenameField(
            model_name='lead',
            old_name='company_country',
            new_name='country',
        ),

        # ── CompanyPerson Changes ──────────────────────────────────────────────
        migrations.RemoveIndex(
            model_name='companyperson',
            name='crm_company_lead_id_1c6d12_idx',
        ),
        migrations.RemoveConstraint(
            model_name='companyperson',
            name='uniq_person_per_lead_role',
        ),
        migrations.RenameField(
            model_name='companyperson',
            old_name='companyperson_name',
            new_name='full_name',
        ),
        migrations.RenameField(
            model_name='companyperson',
            old_name='role',
            new_name='job_title',
        ),
        migrations.RenameField(
            model_name='companyperson',
            old_name='linkedin_url',
            new_name='linkedin',
        ),
        migrations.AddField(
            model_name='companyperson',
            name='headline',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.RemoveField(
            model_name='companyperson',
            name='phone',
        ),
        migrations.RemoveField(
            model_name='companyperson',
            name='website',
        ),
        migrations.RemoveField(
            model_name='companyperson',
            name='is_primary',
        ),
        migrations.AlterModelOptions(
            name='companyperson',
            options={'ordering': ['lead_id', 'full_name']},
        ),
        migrations.AddConstraint(
            model_name='companyperson',
            constraint=models.UniqueConstraint(fields=('lead', 'full_name', 'job_title'), name='uniq_person_per_lead_role'),
        ),
    ]
