param(
    [Parameter(Mandatory = $true)][string]$DumpPath,
    [string]$Container = 'erp-core-postgres',
    [string]$Database = ('erp_restore_acceptance_' + (Get-Date -Format 'yyyyMMdd_HHmmss')),
    [ValidateRange(1, 100000)][int]$ExpectedPermissions = 80,
    [ValidateRange(1, 100000)][int]$ExpectedSequences = 14,
    [ValidateRange(1, 100000)][int]$MinimumMigrations = 1
)
$ErrorActionPreference = 'Stop'
if ($Database -notmatch '^erp_restore_acceptance_[a-z0-9_]+$') { throw 'Use a dedicated acceptance database name' }
$taskDump = (Resolve-Path -LiteralPath $DumpPath).Path
$taskContainerDump = "/tmp/$Database.dump"
& docker cp $taskDump "${Container}:$taskContainerDump"
if ($LASTEXITCODE -ne 0) { throw 'Copy failed' }
& docker exec $Container createdb -U erp $Database
if ($LASTEXITCODE -ne 0) { throw 'Create failed; existing databases are never overwritten' }
& docker exec $Container pg_restore -U erp -d $Database --no-owner --no-privileges --exit-on-error $taskContainerDump
if ($LASTEXITCODE -ne 0) { throw 'Restore failed' }
$taskSql = @'
SELECT json_build_object(
 'company', (SELECT company_code FROM companies LIMIT 1),
 'permissions', (SELECT count(*) FROM permissions),
 'sequences', (SELECT count(*) FROM sequences),
 'admin', (SELECT count(*) FROM roles WHERE code = 'ADMIN'),
 'adminPermissions', (SELECT count(*) FROM role_permissions rp JOIN roles r ON rp.role_id = r.id WHERE r.code = 'ADMIN'),
 'migrations', (SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL));
'@
$taskResult = & docker exec $Container psql -U erp -d $Database -At -v ON_ERROR_STOP=1 -c $taskSql
if ($LASTEXITCODE -ne 0) { throw 'Query failed' }
$taskEvidence = $taskResult | ConvertFrom-Json
if ($taskEvidence.company -ne 'DEFAULT' -or $taskEvidence.permissions -ne $ExpectedPermissions -or $taskEvidence.sequences -ne $ExpectedSequences -or $taskEvidence.admin -ne 1 -or $taskEvidence.adminPermissions -ne $ExpectedPermissions -or $taskEvidence.migrations -lt $MinimumMigrations) { throw 'Baseline counts did not match' }
Write-Output "Restore verified in local database $Database"
$taskEvidence | ConvertTo-Json
