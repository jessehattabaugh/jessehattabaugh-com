---
applyTo: '/infrastructure/**.js'
---

# AWK CDK Guidelines

-   **Model logical units as constructs.** Group Website, DB, monitoring, etc. into reusable L2/L3 constructs.
-   **Start small; split by deploy boundary.** Begin with one app/stack, then partition into independently deployable stacks to limit blast radius.
-   **Prefer patterns.** Use AWS Solutions Constructs or proven community patterns before writing custom glue.
-   **Keep deployments deterministic.** Pin versions, avoid time‑based randomness, and ensure repeated deploys produce the same result.
-   **Use the modern bootstrap + DefaultStackSynthesizer.** CDK v2 requires the modern bootstrap; customize only if you understand the contract.
-   **Environment agnostic code.** Don’t hard‑code ARNs; parameterize account/region and pass env/config centrally.
-   **Tags everywhere.** Apply mandatory cost/owner/env tags via Aspects; define precedence intentionally.
-   **Security by default.** Least‑privilege IAM, encryption at rest/in transit, restrict public access, enable logging, and set log retention explicitly.
-   **Never commit secrets.** Use Secrets Manager/SSM; inject at deploy time if you must seed values.
-   **Automated checks.** Run `cdk-nag` in unit tests/CI; fail builds on critical findings, suppress with justification.
-   **Test constructs.** Write assertions/snapshot tests for synthesized templates; add integration tests for key paths.
-   **Use pipelines.** Deploy via CDK Pipelines/CodePipeline with stages, manual approvals, and `cdk diff` gates.
-   **Set explicit RemovalPolicies.** `DESTROY` for ephemeral/dev, `RETAIN` or snapshots for prod data.
-   **Prefer generated names.** Let CDK/name tokens manage uniqueness; only fix names when required by integrations.
-   **Use Aspects for cross‑cutting rules.** Centralize tagging, encryption enforcement, and policy validation.
-   **Bundle assets reproducibly.** Use CDK bundling (e.g., esbuild) for Lambda/containers; avoid “latest” image tags.
-   **Control stack size & dependencies.** Keep stacks reasonably small, avoid circular refs; share via Outputs/SSM where appropriate.
-   **Document conventions.** Repo contains one CDK app with clear folder structure, coding standards, and lint/format hooks.
-   **Scale org adoption.** Provide templates, golden patterns, and guardrails so teams don’t fork practices ad hoc.
