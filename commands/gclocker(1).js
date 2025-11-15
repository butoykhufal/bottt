const fs = require("fs");
const path = require("path");
const stateFile = path.join(__dirname, "gclock_state.json");

let persisted = {};
try {
  if (fs.existsSync(stateFile)) {
    persisted = JSON.parse(fs.readFileSync(stateFile, "utf8")) || {};
  }
} catch (e) {
  console.error("gclock: failed to load state file:", e);
  persisted = {};
}

function saveState() {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(persisted, null, 2), "utf8");
  } catch (e) {
    console.error("gclock: failed to save state file:", e);
  }
}

if (!global.gcLockerActive) global.gcLockerActive = {};

function looksLikeThreadID(token) {
  return /^\d{6,}$/.test(token);
}

module.exports = {
  config: {
    name: "gclocker",
    description: "Per-GC group chat name locker (use command keyword: gclock).",
    author: "You + ChatGPT",
    role: 0,
    nonPrefix: true,
  },

  handleEvent: async ({ api, event }) => {
    const { threadID, body, logMessageType, logMessageData } = event;
    if (!body && logMessageType !== "log:thread-name") return;

    const raw = body ? body.trim() : "";
    const lower = raw.toLowerCase();

    const cmdSet = ",";
    const stopTrigger = "hinto";

    // ----- SET / UPDATE lock -----
    if (lower.startsWith(cmdSet)) {
      const after = raw.substring(cmdSet.length).trim();
      if (!after) return;

      const tokens = after.split(" ");
      let targetThread = threadID;
      let targetName = "lgc ng kkk";

      if (tokens.length >= 2 && looksLikeThreadID(tokens[0])) {
        targetThread = tokens[0];
        targetName = tokens.slice(1).join(" ").trim();
      } else {
        targetName = after;
      }

      if (!targetName) return;

      persisted[targetThread] = { name: targetName, active: true };
      saveState();
      global.gcLockerActive[targetThread] = true;

      try {
        await api.gcname(targetName, targetThread);
      } catch (e) {
        console.error("gclock: error setting gcname:", e);
      }

      return; // silent
    }

    // ----- STOP -----
    if (lower.startsWith(stopTrigger)) {
      const parts = raw.split(/\s+/);
      let targetThread = threadID;
      if (parts.length >= 3 && looksLikeThreadID(parts[2])) targetThread = parts[2];
      else if (parts.length >= 2 && looksLikeThreadID(parts[1])) targetThread = parts[1];

      if (persisted[targetThread]) {
        persisted[targetThread].active = false;
        saveState();
      }
      global.gcLockerActive[targetThread] = false;
      return; // silent
    }

    // ----- HANDLE name change -----
    if (logMessageType === "log:thread-name") {
      const lock = persisted[threadID];
      if (lock && lock.active) {
        const targetName = lock.name;
        const currentName = logMessageData?.name || logMessageData?.newThreadName;

        if (currentName && currentName !== targetName) {
          console.log(`🔔 GC ${threadID} name changed to "${currentName}". Reverting in 2s...`);
          setTimeout(async () => {
            try {
              await api.gcname(targetName, threadID);
              console.log(`✅ GC ${threadID} name reverted to "${targetName}"`);
            } catch (err) {
              console.error("❌ Error reverting GC name:", err);
            }
          }, 10000);
        }
      }
    }
  },
};
