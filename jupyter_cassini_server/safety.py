import functools
import urllib.parse
from typing import Callable, Dict, List, Literal, Type, Union, TypeVar, cast, Any

from pydantic import BaseModel
from jupyter_server.base.handlers import APIHandler

from cassini import env

Q = TypeVar("Q", bound=BaseModel)
R = TypeVar("R", bound=BaseModel)
S = TypeVar("S", bound=APIHandler)


def with_types(
    query_model: Type[Q],
    response_model: Type[R],
    method: Union[Literal["GET"], Literal["POST"]],
) -> Callable[[Callable[[S, Q], R]], Callable[[S], None]]:

    def wrapper(func: Callable[[S, Q], R]) -> Callable[[S], None]:

        if method == "GET":

            def wrap_get(self: S) -> None:
                query: Dict[str, Union[str, List[str]]] = {}

                raw_arguments = urllib.parse.parse_qs(self.request.query)

                for key, raw_val in raw_arguments.items():
                    val = "".join(raw_val)

                    if (
                        "[]" in key
                    ):  # we aren't compatible with object encoding and rely on form no explode.
                        query[key] = val.split(",")
                    else:
                        query[key] = val
                try:
                    response = response_model.model_validate(
                        func(self, query_model.model_validate(query))
                    )
                    self.finish(response.model_dump_json())
                except ValueError:
                    self.send_error(404)

            return wrap_get
        elif method == "POST":

            def wrap_post(self: S) -> None:
                try:
                    query = self.get_json_body()
                    response = response_model.model_validate(
                        func(self, query_model.model_validate(query))
                    )
                    self.finish(response.model_dump_json())
                except ValueError:
                    self.send_error(404)

            return wrap_post
        else:
            raise NotImplementedError

    return wrapper


F = TypeVar("F", bound=Callable[..., Any])


def needs_project(meth: F) -> F:

    @functools.wraps(meth)
    def wraps(self, *args, **kwargs):
        if not env.project:
            self.finish(
                "Current project not set, jupyterlab needs to be launched by Cassini"
            )
            return

        return meth(self, *args, **kwargs)

    return cast(F, wraps)
