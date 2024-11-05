import functools
from http.client import responses
import urllib.parse
from typing import Callable, Dict, List, Literal, Type, Union, TypeVar, cast, Any

from pydantic import BaseModel, ValidationError
from jupyter_server.base.handlers import APIHandler
from tornado.web import HTTPError

from cassini import env
from cassini.meta import MetaValidationError


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
        value = value.split('?')[0]  # for reasons I don't understand, it seems to include queries in the url?
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
                if kwargs and parse_get_query(self.request.query):
                    raise RuntimeError("Receiving a query via parameters and path, this is not supported")
                
                if kwargs:
                    query = parse_path_query(kwargs)
                else:
                    query = parse_get_query(self.request.query)
            elif method == "POST":
                query = self.get_json_body()
            else:
                raise HTTPError(405)
            
            try:
                validated_query = query_model.model_validate(query)
            except (MetaValidationError, ValidationError) as e:
                raise HTTPError(400, reason=e.__class__.__name__, log_message=f'Invalid Query {query}, {e}')
            
            try:
                response = func(self, validated_query)
            except (MetaValidationError, ValidationError) as e:
                raise HTTPError(500, reason=e.__class__.__name__, log_message=f'Invalid Response, {e}')
            except ValueError as e:
                raise HTTPError(404, reason=e.__class__.__name__, log_message=f'Value error from query {query}, {e}')
            
            try:
                validated_response = response_model.model_validate(response)
            except (MetaValidationError, ValidationError) as e:
                # this will actually never happen...
                raise HTTPError(500, reason=e.__class__.__name__, log_message=f'Invalid Response {response}, {e}')
            
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
