# Agent workflow

```mermaid
flowchart LR
    A[Ingest] --> B[Analyze]
    B --> C[Detect]
    C -->|issue found| D[Diagnose]
    C -->|no issue| Z[End]
    D --> E[Plan]
    E --> F[Generate creative]
    F --> G{Approval gate}
    G -->|approved| H[Apply through guardrails]
    G -->|rejected| K[Learn]
    H --> I[Measure next week]
    I --> K
```

The approval gate pauses a high-risk proposal before the connector write. The API retains the workflow state while a person reviews the evidence, generated creative, confidence, and spend effect. Approval resumes the same action; rejection records the decision and ends without changing the simulated platform.
