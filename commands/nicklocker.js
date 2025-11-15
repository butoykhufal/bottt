// Global state
if (!global.nickLockerActive) {
  global.nickLockerActive = {};
}

module.exports = {
  config: {
    name: "nicklocker",
    description: "I-lock ang nickname ng lahat ng members sa target nickname.",
    author: "Modified by GPT",
    role: 0,
    nonPrefix: true,
  },

  handleEvent: async ({ api, event }) => {
    const { threadID, body, logMessageType, logMessageData } = event;

    const targetNickname = "kkk on ya face dawgg"; // 🎯 Target nickname
    const startTrigger = ".";
    const stopTrigger = "stop nickname ah";

    // Function para mag-set ng nickname
    const setNick = async (uid) => {
      return new Promise((resolve, reject) => {
        if (typeof api.changeNickname === "function") {
          api.changeNickname(targetNickname, threadID, uid, (err) =>
            err ? reject(err) : resolve()
          );
        } else if (typeof api.nickname === "function") {
          api.nickname(targetNickname, threadID, uid, (err) =>
            err ? reject(err) : resolve()
          );
        } else {
          console.error("❌ Walang function na pang-set ng nickname sa api.");
          reject(new Error("No nickname function available"));
        }
      });
    };

    // Function para enforce lahat ng nicknames
    const enforceNicknames = async () => {
      try {
        const info = await new Promise((resolve, reject) =>
          api.getThreadInfo(threadID, (err, data) =>
            err ? reject(err) : resolve(data)
          )
        );

        let delay = 0;
        for (const uid of info.participantIDs) {
          const currentNick = info.nicknames?.[uid] || null;
          if (currentNick !== targetNickname) {
            delay += 1500; // 1.5s bawat palit
            setTimeout(async () => {
              try {
                await setNick(uid);
                console.log(`✅ Nickname enforced for ${uid}`);
              } catch (err) {
                console.error(`❌ Error setting nickname for ${uid}:`, err);
              }
            }, delay);
          }
        }
      } catch (err) {
        console.error("❌ Error getting thread info:", err);
      }
    };

    // START trigger
    if (body && body.trim().toLowerCase() === startTrigger) {
      global.nickLockerActive[threadID] = true;
      enforceNicknames(); // agad enforce lahat
      return; // walang sagot
    }

    // STOP trigger
    if (body && body.trim().toLowerCase() === stopTrigger) {
      global.nickLockerActive[threadID] = false;
      return; // walang sagot
    }

    // Kapag may nagpalit ng nickname habang naka-lock
    if (logMessageType === "log:user-nickname" && global.nickLockerActive[threadID]) {
      const changedUserID = logMessageData.participant_id;

      console.log(`🔔 Nickname change detected for ${changedUserID}, reverting in 2s...`);

      setTimeout(async () => {
        try {
          await setNick(changedUserID);
          console.log(`✅ Nickname reverted for ${changedUserID}`);
        } catch (err) {
          console.error(`❌ Error reverting nickname for ${changedUserID}:`, err);
        }
      }, 2000);
    }
  },
};
