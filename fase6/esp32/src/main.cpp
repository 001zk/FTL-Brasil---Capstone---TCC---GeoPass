#include <Arduino.h>
#include <math.h>
#include <stdlib.h>

static const uint32_t BAUD_RATE = 115200;
static const size_t MAX_LINE_LENGTH = 180;
static String inputLine;
static bool overflowed = false;

static bool isDigits(const String &value) {
  if (value.length() == 0 || value.length() > 10) return false;
  for (size_t i = 0; i < value.length(); ++i) {
    if (!isDigit(value[i])) return false;
  }
  return true;
}

static bool isUtcTimestamp(const String &value) {
  if (value.length() != 20 || value[4] != '-' || value[7] != '-' ||
      value[10] != 'T' || value[13] != ':' || value[16] != ':' || value[19] != 'Z') {
    return false;
  }
  for (size_t i = 0; i < value.length(); ++i) {
    if (i == 4 || i == 7 || i == 10 || i == 13 || i == 16 || i == 19) continue;
    if (!isDigit(value[i])) return false;
  }
  return true;
}

static bool splitFields(const String &line, String fields[], size_t expected) {
  size_t count = 0;
  int start = 0;
  while (start <= (int)line.length()) {
    if (count >= expected) return false;
    int separator = line.indexOf('|', start);
    if (separator < 0) {
      fields[count++] = line.substring(start);
      break;
    }
    fields[count++] = line.substring(start, separator);
    start = separator + 1;
  }
  return count == expected;
}

static void reject(const char *reason) {
  Serial.print("ERR|1|");
  Serial.println(reason);
}

static void handleLine(const String &line) {
  String fields[7];
  if (!splitFields(line, fields, 7) || fields[0] != "NEXT" || fields[1] != "1") {
    reject("BAD_MESSAGE");
    return;
  }
  const String satelliteId = fields[2];
  if (!isDigits(satelliteId) || !isUtcTimestamp(fields[3]) ||
      !isUtcTimestamp(fields[4]) || !isUtcTimestamp(fields[5])) {
    reject("BAD_FIELDS");
    return;
  }
  char *end = nullptr;
  float maxElevation = strtof(fields[6].c_str(), &end);
  if (end == fields[6].c_str() || *end != '\0' || !isfinite(maxElevation) ||
      maxElevation < 0.0f || maxElevation > 90.0f) {
    reject("BAD_ELEVATION");
    return;
  }

  Serial.print("PASSAGEM|");
  Serial.print(satelliteId);
  Serial.print('|');
  Serial.print(fields[3]);
  Serial.print('|');
  Serial.print(fields[4]);
  Serial.print('|');
  Serial.print(fields[5]);
  Serial.print('|');
  Serial.println(fields[6]);
  Serial.print("ACK|1|");
  Serial.print(satelliteId);
  Serial.println("|OK");
}

void setup() {
  inputLine.reserve(MAX_LINE_LENGTH);
  Serial.begin(BAUD_RATE);
  delay(250);
  Serial.println("READY|GEOPASS1");
}

void loop() {
  while (Serial.available() > 0) {
    char incoming = (char)Serial.read();
    if (incoming == '\r') continue;
    if (incoming == '\n') {
      if (overflowed) reject("LINE_TOO_LONG");
      else if (inputLine.length() > 0) handleLine(inputLine);
      inputLine = "";
      overflowed = false;
      continue;
    }
    if (!overflowed) {
      if (inputLine.length() >= MAX_LINE_LENGTH) overflowed = true;
      else inputLine += incoming;
    }
  }
}
