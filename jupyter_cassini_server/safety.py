import functools
import urllib.parse
from typing import Callable, Dict, List, Literal, Type, Union, TypeVar, cast, Any

from pydantic import BaseModel, ValidationError
from jupyter_server.base.handlers import APIHandler

from cassini import env

Q = TypeVar("Q", bound=BaseModel)
R = TypeVar("R", bound=BaseModel)
S = TypeVar("S", bound=APIHandler)

RawQueryType = Dict[str, Union[str, List[str]]]


def parse_get_query(raw_query: str) -> RawQueryType:
    """
    raw_query: str
        to encode arrays, the key must end with `[]` e.g. `a[]=1,2,3`. We do not support objects and
        arrays must be encoded using the form, no-explode method.
    """
    query: RawQueryType = {}
    raw_arguments = urllib.parse.parse_qs(raw_query)

    for key, raw_val in raw_arguments.items():
        val = "".join(raw_val)

        if (
            "[]" in key
        ):  # we aren't compatible with object encoding and rely on form no explode.
            query[key] = val.split(",")
        else:
            query[key] = val
    
    return query


def parse_path_query(raw_query: Dict[str, str]) -> Dict[str, List[str]]:
    query = {}

    for key, value in raw_query.items():
        if '/' in value:
            query[key] = [v for v in value.split('/') if v]
        else:
            query[key] = [value] if value else []
    
    return query


def with_types(
    query_model: Type[Q],
    response_model: Type[R],
    method: Union[Literal["GET"], Literal["POST"]],
) -> Callable[[Callable[[S, Q], R]], Callable[[S], None]]:

    def wrapper(func: Callable[[S, Q], R]) -> Callable[[S], None]:
    
        def wrap_handler(self: S, **kwargs) -> None:
            if method == "GET":
                if kwargs and self.request.query:
                    raise RuntimeError("Receiving a query via parameters and path, this is not supported")
                
                if kwargs:
                    query = parse_path_query(kwargs)
                else:
                    query = parse_get_query(self.request.query)
            elif method == "POST":
                query = self.get_json_body()
            else:
                raise NotImplementedError
            
            try:
                validated_query = query_model.model_validate(query)
            except ValidationError:
                return self.send_error(400, message=f'Invalid Query {query}')
            
            try:
                response = func(self, validated_query)
            except ValidationError:
                return self.send_error(500, message='Invalid Response')
            except ValueError:
                return self.send_error(404)
            
            try:
                validated_response = response_model.model_validate(response)
            except ValidationError:
                # this will actually never happen...
                return self.send_error(500, message=f'Invalid Response {response}')
            
            self.finish(validated_response.model_dump_json(by_alias=True, exclude_defaults=True))
            return
        
        return wrap_handler

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
