const Client = require("ssh2").Client;
const readline = require("readline");
function createConnection(host, username, password, command) {
  const conn = new Client();
  return new Promise((resolve, reject) => {
    conn
      .on("ready", () => {
        conn.exec(command, (err, stream) => {
          if (err) throw err;
          stream
            .on("close", (code, signal) => {
              conn.end();
              resolve();
            })
            .on("data", (data) => {
              //   color green
              console.log(
                "Host : ",
                // yellow
                "\x1b[33m",
                host,
                "\x1b[0m",
                "==>",
                "\x1b[32m",
                "Complete!"
              );
              //   reset color
              console.log("\x1b[0m");
              resolve(data);
            })
            .stderr.on("data", (data) => {
              console.log(`stderr: ${data}`);
              //   color red
              console.log(
                "Host : ",
                host,
                "==>",
                "\x1b[31m",
                "Error!",
                "\x1b[0m",
                `stderr: ${data}`
              );
            });
        });
      })
      .on("error", (err) => {
        reject(err);
      })
      .connect({
        host,
        port: 22,
        username,
        password,
      });
  });
}
const fs = require("fs");
const hostTextFile = fs.readFileSync("./hosts.txt", "utf8");
const passwordTextFile = fs.readFileSync("./password.txt", "utf8");
let hosts = hostTextFile.split("\r\n").map((host, index) => {
  return {
    host,
    username: "root",
    password: passwordTextFile.split("\r\n")[index],
  };
});

function bypassHost(host) {
  // save host to bypass.txt
  fs.appendFile("bypass.txt", host + "\r\n", function (err) {
    if (err) throw err;
    console.log("Saved!");
  });
}

// log => host
console.log(
  "\x1b[32m",
  "================== HOST LIST ==================",
  "\x1b[0m"
);
hosts.forEach((host) => {
  // pattern ==> ${host}
  console.log(`Host:`, "\x1b[33m", ` ${host.host}`, "\x1b[0m");
});
console.log(
  "\x1b[32m",
  "===============================================",
  "\x1b[0m"
);
console.log("Host Count : ", "\x1b[32m", hosts.length, "\x1b[0m");
async function main() {
  // set question
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter your command or type 'q' to quit : ", async (command) => {
    if (command === "q") {
      rl.close();
      return;
    }
    // repeat ask question
    rl.question(
      "You will run this command: " + command + " (y/n) : ",
      async (answer) => {
        if (answer === "y") {
          // anti command rf
          if (command.includes("rm -rf")) {
            console.log("You can't run this command");
            rl.close();
            return;
          }
          const bypassTextFile = fs.readFileSync("./bypass.txt", "utf8");
          const bypassHosts = bypassTextFile.split("\r\n");
          //   ask bypass host
          rl.question(
            "Bypass host [" + bypassHosts.length + "] (y/n) : ",
            async (bypass) => {
              if (bypass === "y") {
                // read bypass.txt

                // filter bypass host
                const filterHosts = hosts.filter((host) => {
                  return !bypassHosts.includes(host.host);
                });
                // set hosts
                hosts = filterHosts;
              }
              // ask show output
              rl.question("Show output (y/n) : ", async (showOutput) => {
                // run command
                let success = 0;
                let fail = 0;
                const successHost = [];
                const failHost = [];
                for (let i = 0; i < hosts.length; i++) {
                  try {
                    console.log(
                      "No.",
                      i + 1,
                      "[Host]",
                      hosts[i].host,
                      "Sending Command...!"
                    );
                    const data = await createConnection(
                      hosts[i].host,
                      hosts[i].username,
                      hosts[i].password,
                      command
                    );
                    success++;
                    successHost.push(hosts[i].host);
                    if (showOutput === "y") {
                      console.log(data.toString());
                    }
                  } catch (error) {
                    console.log(
                      "Host",
                      hosts[i].host,
                      "Sent Command Error...!"
                    );
                    bypassHost(hosts[i].host);
                    fail++;
                    failHost.push(hosts[i].host);
                  }
                }
                console.log("Done all!");
                // count all
                console.log("Total Host : ", hosts.length);
                console.log(
                  "REPORT, success: [",
                  "\x1b[32m",
                  success,
                  "\x1b[0m",
                  "] fail: [",
                  "\x1b[31m",
                  fail,
                  "\x1b[0m",
                  "]"
                );
                // green
                console.log(
                  "\x1b[32m",
                  "================== SUCCESS ==================",
                  "\x1b[0m"
                );
                // reset
                successHost.forEach((host) => {
                  // yellow before host
                  console.log("==> ", "\x1b[33m", host, "\x1b[0m");
                });
                // red
                console.log(
                  "\x1b[31m",
                  "================== FAIL ==================",
                  "\x1b[0m"
                );
                failHost.forEach((host) => {
                  // yellow before host
                  console.log("==> ", "\x1b[33m", host, "\x1b[0m");
                });
                // reset color
                console.log("\x1b[0m");
                rl.close();
                return;
              });
            }
          );
        } else {
          rl.close();
          return;
        }
      }
    );
  });
}

main();
