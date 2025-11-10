#!/bin/bash

HOST="$REOLINK_NVR_HOST" # Your NVR or Camera IP Address
USER="$REOLINK_NVR_USER" # Your username
PASS="$REOLINK_NVR_PASS" # Your password
# Set this to true and the script will dump the request/response
# payloads to stderr.
DEBUG=false

### END OF CONFIGURATION ###

URL="https://$HOST/cgi-bin/api.cgi"

# TOKEN must initially be set to null, so that it gets passed to the
# login command as `?cmd=Login&token=null`
TOKEN="null"

# Takes an API command as the first argument, and JSON-ish payload as
# an optional second argument.  If a payload is provided it's
# processed with `jq -n` to make it easier (jq -n doesn't require
# property names to be quoted, you can have trailing commas and other
# stuff that isn't actually valid JSON)
rl-api() {
  local CMD="$1" PARAM='{}'
  if [ -n "$2" ]; then PARAM="$(jq -n "$2")"; fi
  local REQ="$(
    jq -n --arg CMD "$CMD" --argjson PARAM "$PARAM" '{
      cmd: $CMD,
      action: 0,
      param: $PARAM,
    }'
  )"
  local TGT="$URL?cmd=$CMD&token=$TOKEN"
  if $DEBUG; then
    echo ">>> REQUEST >>>" 1>&2
    echo "TARGET: $TGT" 1>&2
    jq -C . <<<"$REQ" 1>&2
  fi
  local RES="$(
    curl -kfsSLH 'Content-Type: application/json' -d "[$REQ]" -XPOST "$TGT" |
      jq '.[0]'
  )"
  if $DEBUG; then
    echo "<<< RESPONSE <<<" 1>&2
    jq -C . <<<"$RES" 1>&2
  fi
  # If the response had "code: 0" then it was successful, otherwise it
  # was an error
  if [ "$(jq -r '.code' <<<"$RES")" -eq "0" ]; then
    jq '.value' <<<"$RES"
    return 0
  else
    echo -n "$CMD ERROR: " 1>&2
    jq -r '"\(.error.detail) (\(.error.rspCode))"' <<< "$RES" 1>&2
    return 1
  fi
}
# Send a Login command to the API
rl-login() {
  rl-api Login "$(
    jq -n --arg USER "$USER" --arg PASS "$PASS" '{
      User: { userName: $USER, password: $PASS }
    }'
  )" | jq -r '.Token.name'
}
# Send a Logout command to the API
rl-logout() {
  if [ "$TOKEN" = "null" ] || [ "$TOKEN" = "" ]; then return; fi
  rl-api Logout > /dev/null
}

# Login with username and password and get a session token
TOKEN="$(rl-login)"
if [ -z "$TOKEN" ]; then exit 1; fi

# Now that we have a token, we add an exit hook to remove it when the
# script exits, if you leave it around you may get the dreaded (and
# annoying) "max session" error.  If that happens all you can really
# do is wait, by default the tokens are good for an hour (and the
# session limit is global, so using multiple usernames won't help)
trap 'rl-logout' EXIT

# Process any arguments on the command line as commands, if the
# command is followed by something that looks like a payload, then
# pass that as the payload to the command.
while (( $# )); do
  CMD="$1" ; shift
  #if (( $# )) && jq -eR 'try(fromjson)' <<<"$1"; then
  if (( $# )) && [[ $1 == *[{}]* ]]; then
    PAYLOAD="$1" ; shift
  else
    PAYLOAD="{}"
  fi
  rl-api "$CMD" "$PAYLOAD" || exit 1
done