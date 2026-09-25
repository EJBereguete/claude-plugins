# Azure Transport, Layout and Attachments

Load this module only when Azure Boards needs a REST/CLI fallback, non-ASCII
or rich-text fields, form-layout discovery, or attachments. The normal
provider flow and approvals remain in `SKILL.md` and `CHANGE-SETS.md`.

## 1. Transport selection

Use the narrowest green capability:

1. official Azure DevOps MCP with structured field values;
2. Azure DevOps REST with a structured JSON Patch body;
3. Azure CLI only for a capability whose arguments do not carry business
   text and whose output is not the verification source for that text.

Record the selected transport per operation. A fallback is not equivalent to
the primary transport and must appear in doctor evidence and preview.

Never rebuild an approved operation from prose. The request payload is derived
from the exact operation in the fingerprinted change-set JSON.

## 2. Unicode-safe payloads

Business text includes titles, descriptions, acceptance criteria, repro
steps, comments, tags and attachment names. For REST fallback:

1. Serialize the JSON Patch as UTF-8 from structured values.
2. Write it beneath
   `agteamos/.cache/work-items/<fingerprint>/<operation-key>.json`.
3. Do not interpolate business text into a shell command, heredoc, inline
   PowerShell/script literal or CLI field argument.
4. Send the file bytes as the request body without a second shell parse.
5. Reparse the file immediately before sending and compare its operation
   values to the approved change-set operation.
6. Retain payload/response evidence until the batch result is durable.

This rule applies on every OS. It is mandatory on Windows when text contains
non-ASCII characters because shell/CLI code pages can corrupt valid Unicode
without returning an error.

Do not log access tokens, authorization headers or complete responses that
contain identities or other sensitive fields.

## 3. Value-aware read-back

Never verify text by checking only for a replacement character or a known
mojibake pattern. Valid UTF-8 can still represent the wrong characters.

- Plain fields: compare the returned structured string to the approved value
  using Unicode NFC; differences in code points are failure.
- Rich text: sanitize and canonicalize only provider-documented,
  presentation-only HTML changes, then compare text, structure and links.
  Normalization must never remove or transliterate user-visible characters.
- Numeric, boolean, identity and picklist fields: compare typed values.
- Relations: compare relation type, target URL/ID and approved attributes.
- Attachments: compare relation URL, filename/comment when exposed, and the
  content hash retained from the uploaded source.

If a CLI renderer is known or observed to alter Unicode, its output is
diagnostic only. Verify through MCP structured output or direct REST JSON.
HTTP success without value equality remains `failed`.

## 4. Form-layout discovery

A display label such as “Description” does not prove the backing field is
`System.Description`. In inherited/custom processes a Bug or custom WIT may
bind the visible control to another reference name.

Before writing a field whose visible placement matters:

1. inspect WIT fields and rules;
2. if label-to-reference mapping is ambiguous, read the effective form layout;
3. record process ID, WIT reference name, control label and backing field;
4. use the discovered reference name in the draft;
5. re-read that field after apply.

If layout discovery is unavailable, mark `wit_layout` blocked and do not claim
that data will appear in a particular form control. A project-owned override
may declare a mapping only with evidence and freshness criteria.

## 5. Attachments

Attachments are optional evidence, never an implicit side effect.

Before draft:

- source path must be inside the verified project root;
- file must exist, be readable and have a stable size/SHA-256;
- inspect the intended content for secrets, credentials, unsafe logs and
  unnecessary personal data;
- resolve MIME type and a safe filename;
- confirm provider size/type limits and attachment/link capabilities.

The change set includes:

```yaml
operation: attach
source:
  path: <project-relative path>
  sha256: <content hash>
  size: <bytes>
  media_type: <type>
  filename: <safe filename>
targets: [<provider id or temporary key>]
relation:
  type: AttachedFile
  comment: <approved text>
```

Changing bytes, filename, comment or targets invalidates the fingerprint.

Execution order:

1. re-hash/re-size immediately before upload;
2. upload once when Azure permits URL reuse;
3. capture the returned attachment URL without credentials;
4. add one approved relation per target;
5. expand/re-read relations for every target;
6. mark each upload/relation separately in the journal.

A failed relation does not justify deleting the uploaded blob automatically.
Stop the remaining dependent operations and propose a repair change set.

Prefer repository/permalink links when they provide sufficient access and
traceability. Attach only when the user requests it or project policy requires
portable evidence.

## 6. Iterations, dates and time zones

- Read iteration path and dates from the effective team configuration.
- Preserve offsets and show provider value plus user-facing interpretation.
- Never add/subtract a universal day or assume the organization time zone.
- If a proposed date is derived rather than explicitly returned/decided, mark
  it `Proposed` and require approval.
- Read back stored dates and report any provider normalization.

## 7. Cache lifecycle

Payloads and raw responses are runtime evidence under
`agteamos/.cache/work-items/` and are never committed. After read-back,
persist only the sanitized result required by `tracker-result.md`: fingerprint,
operation key/status, provider IDs/URLs, field comparison outcome, attachment
hash/URL and errors. Raw evidence may then be removed according to project
retention policy.

## Anti-patterns

- Passing accented/rich text as shell/CLI arguments.
- Treating “no replacement character found” as encoding verification.
- Assuming the field behind a form label.
- Attaching logs or reports without content review and exact approval.
- Uploading a file whose hash differs from the preview.
- Applying any tenant/customer-specific timezone correction globally.
