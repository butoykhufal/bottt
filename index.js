/* @author Aljur Pogoy
 * @moderators: Kenneth Panio, Liane Cagara 
 * @admins: Aljur Pogoy, Kenneth Panio, GeoTeam.
*/

require("tsconfig-paths").register();
require("ts-node").register();
require("./core/global");
const { MongoClient } = require("mongodb");
const fs = require("fs-extra");
const path = require("path");
const login = require("fbvibex");
const { handleAuroraCommand, loadAuroraCommands } = require("./core/aurora");
const chalk = require("chalk");
const chokidar = require("chokidar");
loadAuroraCommands();

/* @GlobalVar */
global.threadState = { active: new Map(), approved: new Map(), pending: new Map() };
global.client = { reactionListener: {}, globalData: new Map() };
global.Kagenou = { autodlEnabled: false, replies: {} };
global.db = null;
global.config = { admins: ["61576134523731"], moderators: [], developers: [], Prefix: ["/"], botName: "Shadow Garden Bot", mongoUri: null };
global.globalData = new Map();
global.usersData = new Map();
global.disabledCommands = new Map();
global.userCooldowns = new Map();
global.commands = new Map();
global.nonPrefixCommands = new Map();
global.eventCommands = [];
global.appState = {};
global.reactionData = new Map();
global.usageTracker = new Map();
global.userXP = new Map();
global.messageTracker = new Map();
global.nsfwEnabled = new Map();
global.maintenanceMode = false; 

process.once("unhandledRejection", console.error);
process.once("exit", () => {
  fs.writeFileSync(path.join(__dirname, "database", "globalData.json"), JSON.stringify([...global.globalData]));
});

const reloadCommands = () => {
  global.commands.clear();
  global.nonPrefixCommands.clear();
  global.eventCommands.length = 0;
  loadCommands();
};

global.threadConfigs = new Map();

global.getPrefix = function (threadID) {
  const config = global.threadConfigs.get(threadID);
  return (config && config.prefix) || global.config.Prefix[0];
};

global.setPrefix = function (threadID, prefix) {
  let config = global.threadConfigs.get(threadID) || {};
  config.prefix = prefix;
  global.threadConfigs.set(threadID, config);
};

global.reloadCommands = reloadCommands;
const AuroraBetaStyler = require(path.join(__dirname, "core", "plugins", "aurora-beta-styler.js"));
const commandsDir = path.join(__dirname, "commands");
const bannedUsersFile = path.join(__dirname, "database", "bannedUsers.json");
const configFile = path.join(__dirname, "config.json");
const globalDataFile = path.join(__dirname, "database", "globalData.json");

if (fs.existsSync(globalDataFile)) {
  const data = JSON.parse(fs.readFileSync(globalDataFile));
  for (const [key, value] of Object.entries(data)) global.globalData.set(key, value);
}

function getUserRole(uid) {
  uid = String(uid);
  const developers = (global.config.developers || []).map(String);
  const moderators = (global.config.moderators || []).map(String);
  const admins = (global.config.admins || []).map(String);
  const vips = (global.config.vips || []).map(String);
  if (vips.includes(uid)) return 4;
  if (developers.includes(uid)) return 3;
  if (moderators.includes(uid)) return 2;
  if (admins.includes(uid)) return 1;
  return 0;
}

global.log = {
  info: (msg) => console.log(chalk.blue("[INFO]"), msg),
  warn: (msg) => console.log(chalk.yellow("[WARN]"), msg),
  error: (msg) => console.log(chalk.red("[ERROR]"), msg),
  success: (msg) => console.log(chalk.green("[SUCCESS]"), msg), 
  event: (msg) => console.log(chalk.magenta("[EVENT]"), msg)
};

const loadCommands = () => {
  const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith(".js") || file.endsWith(".ts"));
  for (const file of commandFiles) {
    try {
      const commandPath = path.join(commandsDir, file);
      delete require.cache[require.resolve(commandPath)];
      const commandModule = require(commandPath);
      const command = commandModule.default || commandModule;
      if (command.config && command.config.name && command.run) {
        global.commands.set(command.config.name.toLowerCase(), command);
        if (command.config.aliases) command.config.aliases.forEach(alias => global.commands.set(alias.toLowerCase(), command));
      }
      if (command.handleEvent) global.eventCommands.push(command);
    } catch (error) {
      console.error(`Error loading command '${file}':`, error);
    }
  }
};

loadCommands();

// --- COOKIE LOADING ---
let appStateData = [];
try {
  appStateData = JSON.parse(fs.readFileSync("./fb_cookies.json", "utf8"));
  global.log.success("Appstate loaded successfully!");
} catch (error) {
  global.log.error("Error loading appstate.dev.json: " + error.message);
}

// --- MAIN LOGIN LOGIC ---
if (appStateData.length > 0) {
  login({ appState: appStateData }, (err, api) => {
    if (err) return global.log.error("Login failed: " + JSON.stringify(err));

    api.setOptions({
      listenEvents: true,
      selfListen: false,
      forceLogin: true,
      online: true,
      autoMarkDelivery: false,
      autoMarkRead: false
    });

    global.log.success(`${global.config.botName} is now ONLINE!`);

    api.listenMqtt(async (err, event) => {
      if (err) return global.log.error("MQTT Error: " + err);

      // Handle Event Commands
      for (const eventCommand of global.eventCommands) {
        try {
          await eventCommand.handleEvent({ api, event, db: global.db });
        } catch (e) { /* silent error */ }
      }

      // Handle Messages
      if (event.type === "message" || event.type === "message_reply") {
        handleMessage(api, event);
      }
    });
  });
}

// Keep the rest of your handleMessage and utility functions below...
async function handleMessage(api, event) {
    // ... (Your existing handleMessage code from the original snippet)
    }
