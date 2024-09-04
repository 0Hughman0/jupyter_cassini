from unittest.mock import Mock
from urllib.parse import urlencode

import pytest
from pydantic import BaseModel, ValidationError

from ..safety import with_types, parse_get_query

class Query(BaseModel):
    param: str


valid_query = Query(param='query param')


class Response(BaseModel):
    content: str


valid_response = Response(content='response content')


class MockServer():

    def __init__(self, query=None, body=None) -> None:
        self.request = Mock()
        self.request.query = query
        self.body: dict = body
        self.finished: str | None = None
        self.error: int | None = None
        self.query: BaseModel | None = None

    def get_json_body(self):
        return self.body
    
    def finish(self, message):
        self.finished = message
    
    def send_error(self, error, message=None):
        self.error = error
        self.message = message


def test_get_query_parser_regular():
    out = parse_get_query('param1=a&param2=ab&param3=abc')
    assert out == {'param1': 'a', 'param2': 'ab', 'param3': 'abc'}


def test_query_parser_array():
    out = parse_get_query('a[]=1,2,3,4&b[]=a,b,c')
    assert out == {'a[]': ['1', '2', '3', '4'], 'b[]': ['a', 'b', 'c']}


def test_get_all_valid():
    class Server(MockServer):

        @with_types(Query, Response, 'GET')  # type: ignore[type-var]
        def endpoint(self, query: Query) -> Response:
            self.query = query
            return valid_response

    s = Server(query=urlencode(dict(valid_query)))
    s.endpoint()
    
    assert s.query == Query(param='value')
    assert Response.model_validate_json(s.finished) == valid_response


def test_get_invalid_query():
    class Server(MockServer):

        @with_types(Query, Response, 'GET')  # type: ignore[type-var]
        def endpoint(self, query: Query) -> Response:
            self.query = query
            return valid_response

    s = Server(query=urlencode(dict(valid_query)))
    s.endpoint()

    assert s.error == 400


def test_get_invalid_response():
    class Server(MockServer):

        @with_types(Query, Response, 'GET')  # type: ignore[type-var]
        def endpoint(self, query: Query) -> Response:
            self.query = query
            return Response(invalid='wassup')

    s = Server(query=urlencode(dict(valid_query)))
    s.endpoint()

    assert s.error == 500


def test_get_not_found():
    class Server(MockServer):

        @with_types(Query, Response, 'GET')  # type: ignore[type-var]
        def endpoint(self, query: Query) -> Response:
            self.query = query
            raise ValueError()
            return valid_response

    s = Server(query=urlencode(dict(valid_query)))
    s.endpoint()

    assert s.error == 404


def test_post_all_valid():
    class Server(MockServer):

        @with_types(Query, Response, 'POST')  # type: ignore[type-var]
        def endpoint(self, query: Query) -> Response:
            self.query = query
            return valid_response

    s = Server(body=dict(valid_query))
    s.endpoint()
    
    assert s.body == dict(valid_query)
    assert s.query == valid_query
    assert Response.model_validate_json(s.finished) == valid_response

