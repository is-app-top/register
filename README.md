# <p align="center"> *.is-app.top - Free Subdomains </p>
**<p align="center"> Get your free `{name}.is-app.top` subdomain </p>**

<img width="1000" height="300" alt="is-app top (6)" src="https://github.com/user-attachments/assets/c2ed1fff-cf9f-46cd-b039-b34927447ad8" />

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
> Passing automated checks does NOT guarantee approval. All submissions undergo manual review to ensure quality and compliance. Read our [Terms of Service](TERMS.md).


## Supported Record Types

- We support **A, AAAA, CNAME, NS, MX, and TXT** record types.
- DNS is provided by **Gcore**. Unlike Cloudflare, Gcore DNS does **not** include proxy/CDN functionality — all records are DNS-only.


## JSON Formatting

To register your subdomain, create a new JSON file in the `./domains` directory. The filename should be in the following format, `yoursubdomain.is-app.top.json`.

Use the following structure for your JSON file.

> [!IMPORTANT]  
> Keep only the necessary records, update their values as needed, and <strong>DELETE</strong> the ones you do not need from the JSON.

> [!IMPORTANT]
> Ensure your JSON file is valid with NO trailing commas. You can easily check the format validity [here](https://jsonlint.com).

Template:
```json
{
  "subdomain": "yoursubdomain",
  "domain": "is-app.top",
  "email_or_discord": "user@example.com or user",
  "github_username": "user",
  "description": "A brief description of the purpose of the subdomain",

  "records": {
    "A":     ["1.0.0.1", "1.0.0.2"],
    "AAAA":  ["2000:db8::1", "2000:db8::2"],
    "CNAME": ["example.com"],
    "NS":    ["ns1.example.com", "ns2.example.com"],
    "MX":    ["mail1.example.com","mail2.example.com"],
    "TXT":   ["v=spf1 include:_spf.example.com ~all"]
  }
}
```


## Fields Explanation

- `subdomain`: Your desired subdomain (e.g., "myproject" for myproject.is-app.top)
- `domain`: Always "is-app.top"
- `email_or_discord`: Your email or Discord username to protect your email from web scraping
- `github_username`: Your GitHub username
- `description`: A brief description of your subdomain's purpose
- `records`: DNS records for your subdomain. Only keep the ones you need. [Learn more](https://gcore.com/docs/dns/dns-records/).


## Terms and Conditions

By using this service, you agree to be bound by our [Terms of Service](TERMS.md). Please review them carefully.


## License

MIT License


## Support

If you need help or have questions, please open an issue in this repository or send an email to contact@is-app.top


## Featured

If you're interested in registering subdomains similar to `*.is-app.top`, consider exploring these services:
- [Open Domains](https://open-domains.net)
- [is-a.dev](https://www.is-a.dev)
- [thedev.id](https://thedev.id)
- [js.org](https://js.org)


