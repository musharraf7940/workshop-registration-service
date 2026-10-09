from models import AuditLog

def log(db, actor_id, action, entity, entity_id=None, detail=""):
    # Added to the caller's session, so it commits or rolls back
    # together with the change it describes.
    db.add(AuditLog(actor_id=actor_id, action=action, entity=entity,
                    entity_id=entity_id, detail=detail))