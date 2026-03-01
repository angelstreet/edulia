from uuid import UUID


def check_permission(
    user_roles: list,
    required_permission: str,
    scope_type: str | None = None,
    scope_id: UUID | None = None,
) -> bool:
    """Check if user has the required permission, optionally scoped."""
    for ur in user_roles:
        if ur.revoked_at is not None:
            continue
        role = ur.role
        if not role or not role.permissions:
            continue

        # Check if role has the permission
        if required_permission not in role.permissions:
            continue

        # If no scope filtering needed, permission granted
        if scope_type is None:
            return True

        # Check scope: tenant-level grants access everywhere
        if ur.scope_type == "tenant":
            return True

        # Specific scope must match
        if ur.scope_type == scope_type and (scope_id is None or ur.scope_id == scope_id):
            return True

    return False
