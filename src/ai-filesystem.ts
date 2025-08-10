/**
 * @synet/fs-ai - AI-Safe Filesystem Adapter
 *
 * Simple, stateless adapter that provides AI safety through:
 * - Home path for simplified AI navigation
 * - Path allowlist/blocklist enforcement
 * - Operation restrictions
 * - Path traversal protection
 * - Read-only mode support
 */

import {  resolve, relative } from "node:path";
import type { IAsyncFileSystem } from "./async-filesystem.interface.js";

/**
 * AI Safety Configuration
 */
export interface AISafetyConfig {
	// Path Security
	homePath?: string; // Base home directory for AI operations (default: current working directory)
	allowedPaths?: string[]; // Whitelist of allowed paths relative to homePath (if empty, all paths allowed except forbidden)
	forbiddenPaths?: string[]; // Blacklist of forbidden paths relative to homePath
	maxDepth?: number; // Maximum directory depth (default: 10)

	// Operation Restrictions
	allowedOperations?: AIOperation[]; // Allowed operations (default: all)
	readOnly?: boolean; // If true, only read operations allowed (default: false)
}

/**
 * AI filesystem operations
 */
export type AIOperation =
	| "readFile"
	| "writeFile"
	| "exists"
	| "deleteFile"
	| "deleteDir"
	| "ensureDir"
	| "readDir"
	| "chmod";

/**
 * Default AI safety configuration
 */
const DEFAULT_AI_CONFIG: Required<AISafetyConfig> = {
	homePath: process.cwd(), // Default to current working directory
	allowedPaths: [], // Empty = allow all except forbidden
	forbiddenPaths: [
		"/etc/",
		"/var/",
		"/usr/",
		"/sys/",
		"/proc/",
		"/bin/",
		"/sbin/",
	],
	maxDepth: 10,
	allowedOperations: [
		"readFile",
		"writeFile",
		"exists",
		"deleteFile",
		"ensureDir",
		"readDir",
		"deleteDir",
		"chmod",
	],
	readOnly: false,
};

/**
 * AI-Safe Filesystem Adapter
 *
 * Stateless adapter that wraps any IAsyncFileSystem with AI safety restrictions.
 * Can be composed with other filesystem adapters (caching, audit, etc.).
 */
export class AIFileSystem implements IAsyncFileSystem {
	private readonly config: Required<AISafetyConfig>;

	constructor(
		private readonly baseFileSystem: IAsyncFileSystem,
		config: AISafetyConfig = {},
	) {
		// Merge configuration with proper array handling
		this.config = {
			homePath: config.homePath || DEFAULT_AI_CONFIG.homePath,
			allowedPaths: config.allowedPaths || DEFAULT_AI_CONFIG.allowedPaths,
			forbiddenPaths: [
				...DEFAULT_AI_CONFIG.forbiddenPaths,
				...(config.forbiddenPaths || []),
			],
			maxDepth: config.maxDepth || DEFAULT_AI_CONFIG.maxDepth,
			allowedOperations:
				config.allowedOperations || DEFAULT_AI_CONFIG.allowedOperations,
			readOnly: config.readOnly || DEFAULT_AI_CONFIG.readOnly,
		};
	}

	// ==========================================
	// AI SAFETY VALIDATION
	// ==========================================

	/**
	 * Resolve a path relative to the home directory
	 */
	private resolveFromHome(path: string): string {
		// If path is absolute, use it as-is
		if (path.startsWith("/")) {
			return resolve(path);
		}
		
		// Otherwise, resolve relative to homePath
		return resolve(this.config.homePath, path);
	}

	/**
	 * Validate path is safe for AI access
	 */
	private validatePath(path: string): string {
		// Resolve the full path from home directory
		const resolvedPath = this.resolveFromHome(path);
		const homePath = resolve(this.config.homePath);

		// Check against forbidden paths first
		for (const forbidden of this.config.forbiddenPaths) {
			const resolvedForbidden = this.resolveFromHome(forbidden);
			if (resolvedPath.startsWith(resolvedForbidden)) {
				throw new Error("Path not allowed");
			}
		}

		// Check against allowed paths (if specified)
		if (this.config.allowedPaths.length > 0) {
			const isAllowed = this.config.allowedPaths.some((allowed) => {
				const resolvedAllowed = this.resolveFromHome(allowed);
				return resolvedPath.startsWith(resolvedAllowed);
			});

			if (!isAllowed) {
				throw new Error("Path not allowed");
			}
		} else {
			// If no allowedPaths are specified, only check that relative paths stay within home
			// Absolute paths are allowed unless forbidden
			if (!path.startsWith("/")) {
				const relativePath = relative(homePath, resolvedPath);
				if (relativePath.startsWith("..")) {
					throw new Error("Path not allowed");
				}
			}
		}

		// Check directory depth from home (only for relative paths)
		if (!path.startsWith("/")) {
			const relativePath = relative(homePath, resolvedPath);
			const depth = relativePath === "" ? 0 : relativePath.split("/").filter((segment: string) => segment.length > 0).length;

			if (depth > this.config.maxDepth) {
				throw new Error("Path exceeds maximum depth");
			}
		}

		// Return the resolved path for the base filesystem
		return resolvedPath;
	}	/**
	 * Validate operation is allowed
	 */
	private validateOperation(operation: AIOperation): void {
		// Check read-only mode
		if (
			this.config.readOnly &&
			!["readFile", "exists", "readDir"].includes(operation)
		) {
			throw new Error("Operation not allowed");
		}

		// Check allowed operations
		if (!this.config.allowedOperations.includes(operation)) {
			throw new Error(`Operation not allowed: ${operation}`);
		}
	}

	// ==========================================
	// AI-SAFE FILESYSTEM OPERATIONS
	// ==========================================

	async readFile(path: string): Promise<string> {
		this.validateOperation("readFile");
		const resolvedPath = this.validatePath(path);
		return this.baseFileSystem.readFile(resolvedPath);
	}

	async writeFile(path: string, content: string): Promise<void> {
		this.validateOperation("writeFile");
		const resolvedPath = this.validatePath(path);
		return this.baseFileSystem.writeFile(resolvedPath, content);
	}

	async exists(path: string): Promise<boolean> {
		this.validateOperation("exists");
		const resolvedPath = this.validatePath(path);
		return this.baseFileSystem.exists(resolvedPath);
	}

	async deleteFile(path: string): Promise<void> {
		this.validateOperation("deleteFile");
		const resolvedPath = this.validatePath(path);
		return this.baseFileSystem.deleteFile(resolvedPath);
	}

	async createDir(path: string): Promise<void> {
		this.validateOperation("ensureDir");
		const resolvedPath = this.validatePath(path);
		return this.baseFileSystem.ensureDir(resolvedPath);
	}

	async ensureDir(path: string): Promise<void> {
		this.validateOperation("ensureDir");
		const resolvedPath = this.validatePath(path);
		return this.baseFileSystem.ensureDir(resolvedPath);
	}

	async deleteDir(path: string): Promise<void> {
		this.validateOperation("deleteDir");
		const resolvedPath = this.validatePath(path);
		return this.baseFileSystem.deleteDir(resolvedPath);
	}

	async chmod(path: string, mode: number): Promise<void> {
		this.validateOperation("chmod");
		const resolvedPath = this.validatePath(path);
		return this.baseFileSystem.chmod(resolvedPath, mode);
	}

	async readDir(path: string): Promise<string[]> {
		this.validateOperation("readDir");
		const resolvedPath = this.validatePath(path);
		return this.baseFileSystem.readDir(resolvedPath);
	}

	// ==========================================
	// CONFIGURATION ACCESS
	// ==========================================

	/**
	 * Get current AI safety configuration
	 */
	getSafetyConfig(): Required<AISafetyConfig> {
		return { ...this.config };
	}

	/**
	 * Check if operation is allowed
	 */
	isOperationAllowed(operation: AIOperation): boolean {
		if (
			this.config.readOnly &&
			!["readFile", "exists", "readDir"].includes(operation)
		) {
			return false;
		}
		return this.config.allowedOperations.includes(operation);
	}

	/**
	 * Check if path is allowed (without throwing)
	 */
	isPathAllowed(path: string): boolean {
		try {
			this.validatePath(path);
			return true;
		} catch {
			return false;
		}
	}
}

/**
 * Factory function to create AI-safe filesystem
 */
export function createAIFileSystem(
	baseFileSystem: IAsyncFileSystem,
	config?: AISafetyConfig,
): AIFileSystem {
	return new AIFileSystem(baseFileSystem, config);
}
