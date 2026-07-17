import hashlib

import pgtrigger


def mirror_field(source, target):
    """Mirror Django field `source` into `target` via a BEFORE INSERT/UPDATE
    trigger (expand/contract dual-write)."""

    def decorator(model):
        source_col = model._meta.get_field(source).column
        target_col = model._meta.get_field(target).column
        name = "mirror_{}_to_{}".format(source_col, target_col)
        if len(name) > 43:  # stay safely under pgtrigger's trigger-name limit
            digest = hashlib.sha1(
                "{}_{}".format(source_col, target_col).encode()
            ).hexdigest()[:8]
            name = "mirror_{}".format(digest)
        # Change-guard (IS DISTINCT FROM): keeps a read cutover from clobbering
        # writes to the repointed column with the stale source value.
        trigger = pgtrigger.Trigger(
            name=name,
            when=pgtrigger.Before,
            operation=pgtrigger.Insert | pgtrigger.Update,
            func="IF NEW.{s} IS DISTINCT FROM OLD.{s} THEN NEW.{t} = NEW.{s}; END IF; RETURN NEW;".format(
                s=source_col, t=target_col
            ),
        )
        return pgtrigger.register(trigger)(model)

    return decorator
