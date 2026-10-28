export function appReturnTarget(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const scheme = url.protocol.replace(":", "");
    if (scheme !== "exp" && scheme !== "exps" && scheme !== "rv-uddipta") return null;
    return url;
  } catch {
    return null;
  }
}

export function expoReturnUrl(host: string, params: URLSearchParams) {
  const target = new URL(`exp://${host}:8081/--/auth`);
  params.forEach((value, key) => {
    if (key !== "return") target.searchParams.set(key, value);
  });
  return target;
}

export function intentFor(target: URL) {
  const scheme = target.protocol.replace(":", "");
  const packageName = scheme === "rv-uddipta" ? "com.alnlabs.rvuddipta" : "host.exp.exponent";
  return `intent://${target.host}${target.pathname}${target.search}#Intent;scheme=${scheme};package=${packageName};end`;
}

export function handoffPage(intent: string, appUrl: string) {
  const href = intent.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RV Uddiipta</title>
</head>
<body style="font-family: sans-serif; padding: 24px;">
<p>Returning to the app…</p>
<p><a id="open" href="${href}">Open the app</a></p>
<script>
  var open = document.getElementById("open");
  open.click();
  setTimeout(function () { location.href = ${JSON.stringify(appUrl)}; }, 600);
</script>
</body>
</html>`;
}

export function handoffResponse(target: URL) {
  return new Response(handoffPage(intentFor(target), target.toString()), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
