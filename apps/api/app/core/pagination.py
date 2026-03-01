from sqlalchemy.orm import Query


def paginate(query: Query, page: int = 1, page_size: int = 20) -> dict:
    """Paginate a SQLAlchemy query and return standardized response."""
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }
