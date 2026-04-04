# Security Policy

## Supported versions

Security fixes will be applied to the latest released version.

If multiple maintained release lines exist in the future, this policy can be expanded.

## Reporting a vulnerability

Please do **not** open a public GitHub issue for suspected security vulnerabilities.

Instead, report security issues privately by contacting the repository maintainer through GitHub security reporting if enabled, or through a private maintainer contact channel.

When reporting a vulnerability, please include:

- a clear description of the issue
- affected version or commit
- reproduction steps or a proof of concept
- potential impact
- any suggested mitigation, if known

## Response expectations

Best effort will be made to:

1. acknowledge receipt
2. assess impact
3. prepare a fix
4. publish a coordinated release when appropriate

## Scope

This project is a local CLI with no intended network behavior.

Relevant security reports may include:

- unsafe input handling
- command execution issues
- packaging or release integrity issues
- dependency vulnerabilities with real impact on this project
