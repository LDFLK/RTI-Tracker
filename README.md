# RTI Tracker

``` mermaid
flowchart LR
    %% Left pipeline
    Sheet -->|convert_to| CSV
    CSV -->|raw data| RTICLI("RTI CLI")

    %% OpenGIN stacked vertically
    subgraph OpenGIN
        style OpenGIN stroke-dasharray: 5 5
        IngestionAPI("Ingestion API")
        ReadAPI("Read API")
    end

    %% RTI App stacked vertically
    subgraph RTIApp
        style RTIApp stroke-dasharray: 5 5
        RTICLI
        ReactApp("React APP")
    end

    %% Flows with slight offset to avoid crossing
    RTICLI -->|data| IngestionAPI
    ReadAPI -->|data| ReactApp
```
