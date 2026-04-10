# RTI Tracker API Contract

This directory contains the OpenAPI 3.1.0 specifications for the RTI Tracker Backend API. The schemas have been split into a logical directory structure to improve maintainability.

## Important Note: Running the Linter

Whenever you make updates to the contract, **it is highly recommended to run the Linter** to ensure that there are no broken references (`$ref`) or schema violations across the files.

### Validate the OpenAPI Specification
Run the Redocly CLI linter from the root of this `contract/` directory:

```bash
npx -y @redocly/cli lint openapi.yaml
```

If it passes, you'll see a `Woohoo! Your API description is valid.` message.

### Save the output to a file
If you need to analyze errors at length:
```bash
npx -y @redocly/cli lint openapi.yaml > lint_output.txt
```

### Bundle everything for sharing
Once you're satisfied with your changes or need to hand the spec to external consumers, bundle all the files into one monolithic file:
```bash
npx @redocly/cli bundle openapi.yaml -o openapi_bundled.yaml
```
