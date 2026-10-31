# Contributing

Thanks for helping keep `*.is-app.top` tidy.

## Registering a subdomain

1. Fork the repository.
2. Read the [README](README.md) and [Terms of Service](TERMS.md).
3. Add `domains/<subdomain>.is-app.top.json` using [`JSON_FORMAT.json`](JSON_FORMAT.json) as a starting point.
4. Keep only the DNS records you need and delete the rest.
5. Run the local checks:

   ```bash
   npm run check
   ```

6. Open a pull request.

## Rules

- The filename must match the `subdomain` field.
- `domain` must be exactly `is-app.top`.
- `description` must be at least 15 characters.
- A `CNAME` may not point at `is-app.top` or itself.
- A `CNAME` cannot be combined with `A`, `AAAA`, or `NS` records at the same name.
- `TXT` and `MX` records may be listed with a `CNAME`, but they are skipped during deployment because a CNAME cannot share a name with other records. No `TXT` verification record is required.
- `NS` and `MX` targets may not point inside `is-app.top`.
- Reserved names cannot be registered. See [`scripts/reserved_names.json`](scripts/reserved_names.json).
- One GitHub account may own at most 10 subdomains.

## Changing an existing subdomain

Only the GitHub account listed in the file's `github_username` field can change that subdomain. All pull requests, including record-only changes, are manually reviewed.

## Pull requests

- Keep each PR focused on a single subdomain.
- Do not edit unrelated files.
- Make sure `npm run check` passes locally.
