#!/usr/bin/env python3
import argparse
import base64
import json
import os
import sys
import urllib.request
import urllib.error


def get_metadata(path: str) -> str:
    req = urllib.request.Request(
        f"http://metadata.google.internal/computeMetadata/v1/{path}",
        headers={"Metadata-Flavor": "Google"},
    )
    with urllib.request.urlopen(req, timeout=5) as r:
        return r.read().decode("utf-8")


def get_access_token() -> str:
    req = urllib.request.Request(
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
        headers={"Metadata-Flavor": "Google"},
    )
    with urllib.request.urlopen(req, timeout=5) as r:
        data = json.loads(r.read().decode("utf-8"))
    return data["access_token"]


def post_json(url: str, payload: dict, headers: dict) -> dict:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    for k, v in headers.items():
        req.add_header(k, v)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = e.read().decode("utf-8")
        except Exception:
            pass
        raise RuntimeError(f"HTTP {e.code} {e.reason} {detail}") from e
    return json.loads(raw)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate image using Vertex AI Imagen 4 Fast")
    parser.add_argument("prompt", help="Prompt for image generation")
    parser.add_argument("-o", "--output", default="imagen4-fast.png", help="Output PNG path")
    parser.add_argument("--project", default=os.getenv("GOOGLE_CLOUD_PROJECT"), help="GCP project id")
    parser.add_argument("--location", default=os.getenv("VERTEX_LOCATION", "us-central1"), help="Vertex location")
    parser.add_argument("--model", default="imagen-4.0-fast-generate-001", help="Model id")
    parser.add_argument("--aspect-ratio", default="1:1", help="Aspect ratio, e.g. 1:1, 16:9")
    parser.add_argument("--safety-filter-level", default="block_some", help="block_low_and_above|block_medium_and_above|block_only_high|block_none")
    parser.add_argument("--person-generation", default="allow_adult", help="dont_allow|allow_adult|allow_all")
    parser.add_argument("--sample-count", type=int, default=1, help="Number of images")
    args = parser.parse_args()

    project = args.project
    if not project:
        try:
            project = get_metadata("project/project-id")
        except Exception:
            print("ERROR: project id not provided. Use --project or set GOOGLE_CLOUD_PROJECT", file=sys.stderr)
            return 2

    url = (
        f"https://{args.location}-aiplatform.googleapis.com/v1/projects/{project}"
        f"/locations/{args.location}/publishers/google/models/{args.model}:predict"
    )

    payload = {
        "instances": [{"prompt": args.prompt}],
        "parameters": {
            "sampleCount": args.sample_count,
            "aspectRatio": args.aspect_ratio,
            "safetyFilterLevel": args.safety_filter_level,
            "personGeneration": args.person_generation,
        },
    }

    headers = {}
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if api_key:
        headers["x-goog-api-key"] = api_key
    else:
        token = get_access_token()
        headers["Authorization"] = f"Bearer {token}"

    try:
        data = post_json(url, payload, headers)
    except Exception as e:
        print(f"ERROR: request failed: {e}", file=sys.stderr)
        return 1

    predictions = data.get("predictions") or []
    if not predictions:
        print("ERROR: no predictions returned")
        print(json.dumps(data, indent=2)[:4000])
        return 1

    first = predictions[0]
    b64 = first.get("bytesBase64Encoded")
    if not b64:
        print("ERROR: prediction does not include bytesBase64Encoded")
        print(json.dumps(first, indent=2)[:4000])
        return 1

    image = base64.b64decode(b64)
    with open(args.output, "wb") as f:
        f.write(image)

    print(f"OK: wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
