/**
 * @synet/fs-ai Tests
 *
 * Comprehensive test suite for AI-safe filesystem adapter
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MemFileSystem } from "@synet/fs-memory/promises";
import { AIFileSystem, type AISafetyConfig } from "../src/index.js";

describe("AIFileSystem", () => {
	let baseFs: MemFileSystem;
	let aiFs: AIFileSystem;

	beforeEach(() => {
		baseFs = new MemFileSystem();
	});

	describe("Default Configuration", () => {
		beforeEach(() => {
			aiFs = new AIFileSystem(baseFs);
		});

		it("should use default forbidden paths", () => {
			const config = aiFs.getSafetyConfig();
			expect(config.forbiddenPaths).toContain("/etc/");
			expect(config.forbiddenPaths).toContain("/var/");
			expect(config.forbiddenPaths).toContain("/usr/");
			expect(config.forbiddenPaths).toContain("/sys/");
			expect(config.forbiddenPaths).toContain("/proc/");
		});

		it("should allow all operations by default", () => {
			expect(aiFs.isOperationAllowed("readFile")).toBe(true);
			expect(aiFs.isOperationAllowed("writeFile")).toBe(true);
			expect(aiFs.isOperationAllowed("deleteFile")).toBe(true);
			expect(aiFs.isOperationAllowed("ensureDir")).toBe(true);
			expect(aiFs.isOperationAllowed("deleteDir")).toBe(true);
			expect(aiFs.isOperationAllowed("readDir")).toBe(true);
			expect(aiFs.isOperationAllowed("exists")).toBe(true);
			expect(aiFs.isOperationAllowed("chmod")).toBe(true);
		});

		it("should not be read-only by default", () => {
			const config = aiFs.getSafetyConfig();
			expect(config.readOnly).toBe(false);
		});

		it("should have default max depth of 10", () => {
			const config = aiFs.getSafetyConfig();
			expect(config.maxDepth).toBe(10);
		});

		it("should allow empty allowed paths (meaning all except forbidden)", () => {
			const config = aiFs.getSafetyConfig();
			expect(config.allowedPaths).toEqual([]);
		});
	});

	describe("Path Validation", () => {
		beforeEach(() => {
			aiFs = new AIFileSystem(baseFs, {
				allowedPaths: ["./workspace/", "./output/"],
				forbiddenPaths: ["/etc/", "/secret/"],
			});
		});

		it("should allow paths in allowedPaths", () => {
			expect(aiFs.isPathAllowed("./workspace/file.txt")).toBe(true);
			expect(aiFs.isPathAllowed("./output/result.json")).toBe(true);
		});

		it("should block forbidden paths", () => {
			expect(aiFs.isPathAllowed("/etc/passwd")).toBe(false);
			expect(aiFs.isPathAllowed("/secret/key.txt")).toBe(false);
		});

		it("should block path traversal attacks", () => {
			expect(aiFs.isPathAllowed("../../../etc/passwd")).toBe(false);
			expect(aiFs.isPathAllowed("./workspace/../../secret")).toBe(false);
		});

		it("should block paths outside allowed when allowedPaths is set", () => {
			expect(aiFs.isPathAllowed("./other/file.txt")).toBe(false);
			expect(aiFs.isPathAllowed("/tmp/file.txt")).toBe(false);
		});

		it("should normalize paths before validation", () => {
			expect(aiFs.isPathAllowed("./workspace/../workspace/file.txt")).toBe(
				true,
			);
			expect(aiFs.isPathAllowed("./workspace/./file.txt")).toBe(true);
		});

		it("should throw on forbidden path access", async () => {
			await expect(aiFs.readFile("/etc/passwd")).rejects.toThrow(
				"Path not allowed",
			);
			await expect(aiFs.writeFile("/secret/key.txt", "data")).rejects.toThrow(
				"Path not allowed",
			);
		});

		it("should throw on path traversal attempts", async () => {
			await expect(aiFs.readFile("../../../etc/passwd")).rejects.toThrow(
				"Path not allowed",
			);
			await expect(
				aiFs.writeFile("./workspace/../../secret", "data"),
			).rejects.toThrow("Path not allowed");
		});
	});

	describe("Path Validation - Empty Allowed Paths", () => {
		beforeEach(() => {
			aiFs = new AIFileSystem(baseFs, {
				allowedPaths: [], // Empty means allow all except forbidden
				forbiddenPaths: ["/etc/", "/var/"],
			});
		});

		it("should allow any path when allowedPaths is empty, except forbidden", () => {
			expect(aiFs.isPathAllowed("./workspace/file.txt")).toBe(true);
			expect(aiFs.isPathAllowed("./any/path/file.txt")).toBe(true);
			expect(aiFs.isPathAllowed("/tmp/file.txt")).toBe(true);
		});

		it("should still block forbidden paths", () => {
			expect(aiFs.isPathAllowed("/etc/passwd")).toBe(false);
			expect(aiFs.isPathAllowed("/var/log/file.txt")).toBe(false);
		});
	});

	describe("Operation Restrictions", () => {
		beforeEach(() => {
			aiFs = new AIFileSystem(baseFs, {
				allowedOperations: ["readFile", "writeFile", "exists"],
			});
		});

		it("should allow permitted operations", () => {
			expect(aiFs.isOperationAllowed("readFile")).toBe(true);
			expect(aiFs.isOperationAllowed("writeFile")).toBe(true);
			expect(aiFs.isOperationAllowed("exists")).toBe(true);
		});

		it("should block restricted operations", () => {
			expect(aiFs.isOperationAllowed("deleteFile")).toBe(false);
			expect(aiFs.isOperationAllowed("deleteDir")).toBe(false);
			expect(aiFs.isOperationAllowed("chmod")).toBe(false);
		});

		it("should throw on restricted operations", async () => {
			await expect(aiFs.deleteFile("./test.txt")).rejects.toThrow(
				"Operation not allowed",
			);
			await expect(aiFs.deleteDir("./test/")).rejects.toThrow(
				"Operation not allowed",
			);
			await expect(aiFs.chmod("./test.txt", 755)).rejects.toThrow(
				"Operation not allowed",
			);
		});

		it("should allow permitted operations to execute", async () => {
			await expect(
				aiFs.writeFile("./test.txt", "content"),
			).resolves.not.toThrow();
			await expect(aiFs.readFile("./test.txt")).resolves.toBe("content");
			await expect(aiFs.exists("./test.txt")).resolves.toBe(true);
		});
	});

	describe("Read-Only Mode", () => {
		beforeEach(() => {
			aiFs = new AIFileSystem(baseFs, {
				readOnly: true,
			});
		});

		it("should allow read operations in read-only mode", () => {
			expect(aiFs.isOperationAllowed("readFile")).toBe(true);
			expect(aiFs.isOperationAllowed("exists")).toBe(true);
			expect(aiFs.isOperationAllowed("readDir")).toBe(true);
		});

		it("should block write operations in read-only mode", () => {
			expect(aiFs.isOperationAllowed("writeFile")).toBe(false);
			expect(aiFs.isOperationAllowed("deleteFile")).toBe(false);
			expect(aiFs.isOperationAllowed("ensureDir")).toBe(false);
			expect(aiFs.isOperationAllowed("deleteDir")).toBe(false);
			expect(aiFs.isOperationAllowed("chmod")).toBe(false);
		});

		it("should throw on write operations", async () => {
			await expect(aiFs.writeFile("./test.txt", "content")).rejects.toThrow(
				"Operation not allowed",
			);
			await expect(aiFs.deleteFile("./test.txt")).rejects.toThrow(
				"Operation not allowed",
			);
			await expect(aiFs.ensureDir("./test/")).rejects.toThrow(
				"Operation not allowed",
			);
		});

		it("should allow read operations to execute", async () => {
			// Setup data first with base filesystem
			await baseFs.writeFile("./test.txt", "content");

			await expect(aiFs.readFile("./test.txt")).resolves.toBe("content");
			await expect(aiFs.exists("./test.txt")).resolves.toBe(true);
		});
	});

	describe("Max Depth Validation", () => {
		beforeEach(() => {
			aiFs = new AIFileSystem(baseFs, {
				maxDepth: 3,
				allowedPaths: ["./"], // Allow all paths under current directory
			});
		});

		it("should allow paths within depth limit", () => {
			expect(aiFs.isPathAllowed("./a/file.txt")).toBe(true); // depth 2
			expect(aiFs.isPathAllowed("./a/b/file.txt")).toBe(true); // depth 3
			expect(aiFs.isPathAllowed("./a/b/c/file.txt")).toBe(false); // depth 4 - exceeds limit of 3
		});

		it("should block paths exceeding depth limit", () => {
			expect(aiFs.isPathAllowed("./a/b/c/d/file.txt")).toBe(false); // depth 5
			expect(
				aiFs.isPathAllowed("./very/deep/nested/path/structure/file.txt"),
			).toBe(false);
		});

		it("should throw on deep path access", async () => {
			await expect(aiFs.readFile("./a/b/c/d/file.txt")).rejects.toThrow(
				"Path exceeds maximum depth",
			);
		});
	});

	describe("Combined Restrictions", () => {
		beforeEach(() => {
			aiFs = new AIFileSystem(baseFs, {
				allowedPaths: ["./workspace/"],
				forbiddenPaths: ["./workspace/secret/"],
				allowedOperations: ["readFile", "writeFile"],
				readOnly: false,
				maxDepth: 2,
			});
		});

		it("should enforce all restrictions simultaneously", () => {
			// Path restrictions
			expect(aiFs.isPathAllowed("./workspace/file.txt")).toBe(true);
			expect(aiFs.isPathAllowed("./workspace/secret/key.txt")).toBe(false); // forbidden
			expect(aiFs.isPathAllowed("./other/file.txt")).toBe(false); // not allowed

			// Operation restrictions
			expect(aiFs.isOperationAllowed("readFile")).toBe(true);
			expect(aiFs.isOperationAllowed("writeFile")).toBe(true);
			expect(aiFs.isOperationAllowed("deleteFile")).toBe(false);

			// Depth restrictions
			expect(aiFs.isPathAllowed("./workspace/a/b/file.txt")).toBe(false); // depth 3 - exceeds limit of 2
		});

		it("should throw appropriate errors for each type of violation", async () => {
			await expect(aiFs.readFile("./workspace/secret/key.txt")).rejects.toThrow(
				"Path not allowed",
			);
			await expect(aiFs.deleteFile("./workspace/file.txt")).rejects.toThrow(
				"Operation not allowed",
			);
			await expect(aiFs.readFile("./workspace/a/b/c/file.txt")).rejects.toThrow(
				"Path exceeds maximum depth",
			);
		});
	});

	describe("File Operations", () => {
		beforeEach(() => {
			aiFs = new AIFileSystem(baseFs, {
				allowedPaths: ["./workspace/"],
			});
		});

		it("should read and write files successfully", async () => {
			const content = "test content";
			await aiFs.writeFile("./workspace/test.txt", content);
			const readContent = await aiFs.readFile("./workspace/test.txt");
			expect(readContent).toBe(content);
		});

		it("should check file existence", async () => {
			expect(await aiFs.exists("./workspace/nonexistent.txt")).toBe(false);

			await aiFs.writeFile("./workspace/exists.txt", "content");
			expect(await aiFs.exists("./workspace/exists.txt")).toBe(true);
		});

		it("should delete files when allowed", async () => {
			await aiFs.writeFile("./workspace/delete-me.txt", "content");
			expect(await aiFs.exists("./workspace/delete-me.txt")).toBe(true);

			await aiFs.deleteFile("./workspace/delete-me.txt");
			expect(await aiFs.exists("./workspace/delete-me.txt")).toBe(false);
		});

		it("should create and read directories", async () => {
			await aiFs.ensureDir("./workspace/newdir/");
			await aiFs.writeFile("./workspace/newdir/file.txt", "content");

			const files = await aiFs.readDir("./workspace/newdir/");
			expect(files).toContain("file.txt");
		});

		it("should delete directories when allowed", async () => {
			await aiFs.ensureDir("./workspace/deleteme/");
			await aiFs.writeFile("./workspace/deleteme/file.txt", "content");

			await aiFs.deleteDir("./workspace/deleteme/");
			expect(await aiFs.exists("./workspace/deleteme/")).toBe(false);
		});

		it("should change file permissions when allowed", async () => {
			await aiFs.writeFile("./workspace/chmod-test.txt", "content");
			await expect(
				aiFs.chmod("./workspace/chmod-test.txt", 0o644),
			).resolves.not.toThrow();
		});
	});

	describe("Error Messages", () => {
		beforeEach(() => {
			aiFs = new AIFileSystem(baseFs, {
				allowedPaths: ["./workspace/"],
				allowedOperations: ["readFile", "writeFile"],
			});
		});

		it("should provide clear error messages for path violations", async () => {
			try {
				await aiFs.readFile("/etc/passwd");
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error.message).toContain("Path not allowed");
			}
		});

		it("should provide clear error messages for operation violations", async () => {
			try {
				await aiFs.deleteFile("./workspace/file.txt");
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error.message).toContain("Operation not allowed");
			}
		});

		it("should include operation context in errors", async () => {
			try {
				await aiFs.deleteFile("./workspace/file.txt");
			} catch (error) {
				expect(error.message).toContain("deleteFile");
				expect(error.message).toContain("Operation not allowed");
			}
		});
	});

	describe("Configuration Access", () => {
		const customConfig: AISafetyConfig = {
			allowedPaths: ["./test/"],
			forbiddenPaths: ["/custom/"],
			allowedOperations: ["readFile"],
			readOnly: true,
			maxDepth: 5,
		};

		beforeEach(() => {
			aiFs = new AIFileSystem(baseFs, customConfig);
		});

		it("should return complete configuration including defaults", () => {
			const config = aiFs.getSafetyConfig();

			expect(config.allowedPaths).toEqual(["./test/"]);
			expect(config.forbiddenPaths).toContain("/custom/");
			expect(config.forbiddenPaths).toContain("/etc/"); // defaults merged
			expect(config.allowedOperations).toEqual(["readFile"]);
			expect(config.readOnly).toBe(true);
			expect(config.maxDepth).toBe(5);
		});
	});

	describe("Factory Function", () => {
		it("should create AIFileSystem with default config", async () => {
			const { createAIFileSystem } = await import("../src/index.js");
			const fs = createAIFileSystem(baseFs);

			expect(fs).toBeInstanceOf(AIFileSystem);
			expect(fs.getSafetyConfig()).toBeDefined();
		});

		it("should create AIFileSystem with custom config", async () => {
			const { createAIFileSystem } = await import("../src/index.js");
			const config: AISafetyConfig = { readOnly: true };
			const fs = createAIFileSystem(baseFs, config);

			expect(fs.getSafetyConfig().readOnly).toBe(true);
		});
	});
});
