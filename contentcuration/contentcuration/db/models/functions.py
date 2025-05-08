from django.contrib.postgres.functions import Func


class Unnest(Func):
    """
    Expands a set/array into a rows

    Example:
        .annotate(
            my_field=Unnest(Array(Value("a"), Value("b"), Value("c")))
        )
        .values("id", "my_field")
        =>  id | my_field
            -------------
            1  | a
            1  | b
            1  | c
            2  | a
            2  | b
            ...
    """

    function = "UNNEST"
    arity = 1


class ArrayRemove(Func):
    """
    Removes an element value from an array

    Example:
        ArrayRemove(Array(1, 2, 3, None), None)
        => Array[1, 2, 3]
    """

    function = "ARRAY_REMOVE"
    arity = 2


class JSONObjectKeys(Func):
    """
    Returns result set of all JSON object keys for a JSONB field

    Example:
        .annotate(
            my_field=JSONObjectKeys("some_jsonb_col_name")
        )
        .values("my_field")
        .distinct()
        =>  my_field
            -------------
            key1
            other_key
            ...
    """

    function = "JSONB_OBJECT_KEYS"
    arity = 1
