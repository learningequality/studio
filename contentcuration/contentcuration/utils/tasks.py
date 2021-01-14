import celery


def increment_progress(increment=1):
    if celery.current_task:
        total = celery.current_task.total
        current_progress = celery.current_task.progress
        new_progress = min(current_progress + (100 * increment / total), 100)
        celery.current_task.update_state(meta={"progress": new_progress})
        celery.current_task.progress = new_progress


def set_total(total):
    if celery.current_task:
        celery.current_task.total = total
