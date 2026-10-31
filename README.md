# <p align="center"> *.is-app.top - Free Subdomains </p>
**<p align="center"> Get your free `{name}.is-app.top` subdomain </p>**

<img width="1000" height="300" alt="is-app top" src="https://github.com/user-attachments/assets/e8353e8a-8b41-422c-9272-ded816e03fbb" />

<p align="center">
    <img src="https://img.shields.io/github/stars/is-app-top/register?label=stars&style=for-the-badge&color=FFD700" alt="GitHub stars">&nbsp;&nbsp;
    <img src="https://img.shields.io/github/directory-file-count/is-app-top/register/domains?label=domains&type=file&extension=json&style=for-the-badge&color=4CAF50" alt="Domains">&nbsp;&nbsp;
    <img src="https://img.shields.io/github/issues-pr/is-app-top/register?label=Pull%20Requests&style=for-the-badge&color=FFA500" alt="GitHub pull requests">&nbsp;&nbsp;
</p>


## How to Get Your Subdomain

1. 🌟 Fork this repository
2. 📰 Read the entire README and review our [Terms of Service](TERMS.md)
3. 🗄️ Create a JSON file and name it `yoursubdomain.is-app.top.json` in `./domains` of your forked repo.
4. ✍️ Fill in the JSON file (format and instructions below). Make sure the JSON is valid with no trailing commas.
5. 🫷 Open a pull request with your changes.
6. 🤖 Automated checks will run and report any JSON errors. (First-time contributors await a manual trigger.)
7. ✅ After manual review and approval, your subdomain will be live within minutes.

> [!NOTE]
> Passing automated checks does NOT guarantee approval. All pull requests are manually reviewed to ensure quality and compliance. Read our [Terms of Service](TERMS.md).


## Supported Record Types

- We support **A, AAAA, CNAME, NS, MX, and TXT** record types.
- DNS is provided by **Gcore**. Unlike Cloudflare, Gcore DNS does **not** include proxy/CDN functionality — all records are DNS-only.
- A `CNAME` may not be combined with `A`, `AAAA`, `NS`, or `MX` records, and may not point at `is-app.top` or at itself.
- A `TXT` record may be included alongside a `CNAME` when your provider requires it for verification; no `TXT` record is required otherwise.
- `NS` records may not point inside `is-app.top` (no self-delegation).
- `MX` targets may not point inside `is-app.top`.
- `TXT` values are limited to 255 characters per entry.
- Reserved names (for example `www`, `mail`, `admin`, `api`) cannot be registered. See [Reserved names](#reserved-names).


## JSON Formatting

To register your subdomain, create a new JSON file in the `./domains` directory. The filename should be in the following format, `yoursubdomain.is-app.top.json`.

Use the following structure for your JSON file.

> [!IMPORTANT]  
> Keep only the necessary records, update their values as needed, and <strong>DELETE</strong> the ones you do not need from the JSON.

> [!IMPORTANT]
> Ensure your JSON file is valid with NO trailing commas. You can easily check the format validity [here](https://jsonlint.com).

A record example (`TXT` is optional):
```json
{
  "subdomain": "yoursubdomain",
  "domain": "is-app.top",
  "email_or_discord": "user@example.com or user",
  "github_username": "user",
  "description": "A brief description of the purpose of the subdomain",
  "ttl": 3600,

  "records": {
    "A":   ["1.0.0.1", "1.0.0.2"],
    "TXT": ["v=spf1 include:_spf.example.com ~all"]
  }
}
```

CNAME example (no `TXT` verification record required):
```json
{
  "subdomain": "yoursubdomain",
  "domain": "is-app.top",
  "email_or_discord": "user@example.com or user",
  "github_username": "user",
  "description": "A brief description of the purpose of the subdomain",

  "records": {
    "CNAME": ["example.com"]
  }
}
```

> [!NOTE]
> We do not require a `TXT` record for verification. Add `TXT` only if your service actually needs it.
> A `CNAME` cannot be combined with `A`, `AAAA`, `NS`, or `MX` records. Only keep the records you need and delete the rest.


## Fields Explanation

- `subdomain`: Your desired subdomain (e.g., "myproject" for myproject.is-app.top)
- `domain`: Always "is-app.top"
- `email_or_discord`: Your email or Discord username to protect your email from web scraping
- `public_email`: Optional public email address (use instead of `email_or_discord` for system/reserved entries)
- `github_username`: Your GitHub username. Only this account can change the subdomain's records.
- `description`: A brief description of your subdomain's purpose (minimum 15 characters)
- `ttl`: Optional TTL in seconds for all records (60–86400). Defaults to the Gcore default when omitted.
- `records`: DNS records for your subdomain. Only keep the ones you need. [Learn more](https://gcore.com/docs/dns/dns-records/).
  - `MX` entries may be a hostname (priority `20`) or an object: `{ "priority": 10, "target": "mail.example.com" }`.


## Reserved names

A list of system and commonly abused names is reserved and cannot be registered. The current list lives in [`scripts/reserved_names.json`](scripts/reserved_names.json) and is mirrored in [`lists.txt`](lists.txt). Reserved entries in `lists.txt` show `"reserved"`; live subdomains show `"active"`.

If you need a reserved name for a legitimate project, open an issue first.


## Local checks

Run the same checks used by CI before opening a pull request:

```bash
npm run check   # lint + validate + tests (no dependencies to install)
```

You can also run the validator on its own with `npm run validate`.


## Terms and Conditions

By using this service, you agree to be bound by our [Terms of Service](TERMS.md). Please review them carefully.


## License

MIT License


## Support

If you need help or have questions, please open an issue in this repository or send an email to contact@is-app.top


## Featured

If you're interested in registering subdomains similar to `*.is-app.top`, consider exploring these services:
- [is-a.dev](https://www.is-a.dev)
- [thedev.id](https://thedev.id)
- [js.org](https://js.org)


