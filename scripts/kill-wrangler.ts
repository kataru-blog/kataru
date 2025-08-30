import { $ } from "bun";

const killWranglerProcesses = async () => {
    console.log("🔍 Wrangler 관련 프로세스 찾는 중...");
    
    try {
        const processes = await $`ps aux | grep -i wrangler | grep -v grep`.text();
        if (processes.trim()) {
            console.log(processes);
        }
    } catch (e) {
        console.log("실행 중인 wrangler 프로세스 없음");
    }

    console.log("\n💀 Wrangler 프로세스 종료 중 (SIGKILL)...");
    try {
        await $`pkill -9 -f wrangler`.quiet();
        console.log("✅ Wrangler 프로세스 강제 종료 완료");
    } catch (e) {
        console.log("종료할 wrangler 프로세스가 없습니다");
    }

    console.log("\n💀 esbuild 프로세스 종료 중...");
    try {
        await $`pkill -9 -f esbuild`.quiet();
        console.log("✅ esbuild 프로세스 강제 종료 완료");
    } catch (e) {
        console.log("종료할 esbuild 프로세스가 없습니다");
    }

    console.log("\n🔍 Node 프로세스 중 wrangler 관련 확인...");
    try {
        const nodeProcesses = await $`ps aux | grep node | grep -i wrangler | grep -v grep`.text();
        if (nodeProcesses.trim()) {
            console.log(nodeProcesses);
            console.log("\n💀 남은 wrangler 관련 node 프로세스 강제 종료...");
            await $`pkill -9 -f "node.*wrangler"`.quiet();
            console.log("✅ Node wrangler 프로세스 강제 종료 완료");
        }
    } catch (e) {
        console.log("종료할 node wrangler 프로세스가 없습니다");
    }

    console.log("\n💀 tailwindcss 프로세스도 종료...");
    try {
        await $`pkill -9 -f tailwindcss`.quiet();
        console.log("✅ tailwindcss 프로세스 종료 완료");
    } catch (e) {
        console.log("종료할 tailwindcss 프로세스가 없습니다");
    }

    console.log("\n✅ 완료! 현재 실행 중인 wrangler/esbuild 프로세스 확인:");
    try {
        const remaining = await $`ps aux | grep -E "(wrangler|esbuild)" | grep -v grep | grep -v kill-wrangler`.text();
        if (remaining.trim()) {
            console.log(remaining);
        } else {
            console.log("없음 - 모든 관련 프로세스가 종료되었습니다.");
        }
    } catch (e) {
        console.log("없음 - 모든 관련 프로세스가 종료되었습니다.");
    }
};

await killWranglerProcesses();