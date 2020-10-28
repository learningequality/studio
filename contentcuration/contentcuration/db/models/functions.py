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
