var REG_NONE = NewRegistrar("none");
var DNS_BIND = NewDnsProvider("gcore");
var DOMAIN_NAME = "is-app.top";
var DEFAULT_MX_PRIORITY = 20;

function createSubdomainsObject(jsonsPath) {
  var domains = [];
  try {
    // Use glob to get JSONs name as a directory
    // Works recursively, so subfolders are included
    var jsons = glob.apply(null, [jsonsPath, true, ".json"]);

    for (var i = 0; i < jsons.length; i++) {
      try {
        domains.push({ data: require(jsons[i]) });
      } catch (e) {
        console.error(":ERROR: Error loading JSON file:", jsons[i], e);
      }
    }
  } catch (e) {
    console.error(":ERROR: Error finding JSON files in directory (or one of its subs) :", jsonsPath, e);
  }

  return domains;
}

function absoluteName(name) {
  var trimmed = String(name).replace(/\.$/, "");
  return trimmed + ".";
}

function addA(records, name, value, ttl) {
  if (ttl) {
    records.push(A(name, value, TTL(ttl)));
  } else {
    records.push(A(name, value));
  }
}

function addAAAA(records, name, value, ttl) {
  if (ttl) {
    records.push(AAAA(name, value, TTL(ttl)));
  } else {
    records.push(AAAA(name, value));
  }
}

function addCNAME(records, name, value, ttl) {
  if (ttl) {
    records.push(CNAME(name, value, TTL(ttl)));
  } else {
    records.push(CNAME(name, value));
  }
}

function addNS(records, name, value, ttl) {
  if (ttl) {
    records.push(NS(name, value, TTL(ttl)));
  } else {
    records.push(NS(name, value));
  }
}

function addMX(records, name, priority, value, ttl) {
  if (ttl) {
    records.push(MX(name, priority, value, TTL(ttl)));
  } else {
    records.push(MX(name, priority, value));
  }
}

function addTXT(records, name, value, ttl) {
  if (ttl) {
    records.push(TXT(name, value, TTL(ttl)));
  } else {
    records.push(TXT(name, value));
  }
}

function mxPriority(value) {
  if (value && typeof value === "object" && value.priority !== undefined) {
    return parseInt(value.priority, 10);
  }
  return DEFAULT_MX_PRIORITY;
}

function mxTarget(value) {
  if (value && typeof value === "object") {
    return value.target;
  }
  return value;
}

// Create an object of all JSONs
var subdomains = createSubdomainsObject("../domains");

var records = [];
// Parse all JSON files and generate DNS resource records for DNSControl
for (var i = 0; i < subdomains.length; i++) {
  var subdomainData = subdomains[i].data;
  var subdomain = subdomainData.subdomain;
  var recordSet = subdomainData.records || {};
  var ttl = subdomainData.ttl;

  // A Records
  if (recordSet.A) {
    for (var a = 0; a < recordSet.A.length; a++) {
      addA(records, subdomain, recordSet.A[a], ttl);
    }
  }

  // AAAA Records
  if (recordSet.AAAA) {
    for (var aaaa = 0; aaaa < recordSet.AAAA.length; aaaa++) {
      addAAAA(records, subdomain, recordSet.AAAA[aaaa], ttl);
    }
  }

  // CNAME Records
  if (recordSet.CNAME) {
    for (var cname = 0; cname < recordSet.CNAME.length; cname++) {
      addCNAME(records, subdomain, absoluteName(recordSet.CNAME[cname]), ttl);
    }
  }

  // NS Records
  if (recordSet.NS) {
    for (var ns = 0; ns < recordSet.NS.length; ns++) {
      addNS(records, subdomain, absoluteName(recordSet.NS[ns]), ttl);
    }
  }

  // MX Records
  if (recordSet.MX) {
    for (var mx = 0; mx < recordSet.MX.length; mx++) {
      var entry = recordSet.MX[mx];
      addMX(
        records,
        subdomain,
        mxPriority(entry),
        absoluteName(mxTarget(entry)),
        ttl
      );
    }
  }

  // TXT Records
  if (recordSet.TXT) {
    for (var txt = 0; txt < recordSet.TXT.length; txt++) {
      addTXT(records, subdomain, recordSet.TXT[txt], ttl);
    }
  }
}

// Create DNS entries using DNSControl's D() function
D(DOMAIN_NAME, REG_NONE, DnsProvider(DNS_BIND), records);
