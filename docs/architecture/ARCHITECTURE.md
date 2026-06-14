# QA.Interceptor Platform Architecture

## Layers

UI Layer

- Popup
- Side Panel
- Options Page

Core Layer

- Rule Engine
- Request Processor
- Response Processor

Infrastructure Layer

- Browser APIs
- Storage
- Exporters

## Rule Flow

Request

↓

Matcher

↓

Rule Engine

↓

Transformers

↓

Modified Request

↓

Server

↓

Response

↓

Response Transformers

↓

Browser

## Rule Types

HeaderRule

BodyRule

StatusCodeRule

MockRule

DelayRule

RedirectRule

CancelRule
