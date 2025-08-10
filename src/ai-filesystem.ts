/**
 * @synet/fs-ai - AI-Safe Filesystem Adapter
 *
 * Simple, stateless adapter that provides AI safety through:
 * - Path allowlist/blocklist enforcement
 * - Operation restrictions
 * - Path traversal protection
 * - Read-only mode support
 */

import type { IAsyncFileSystem } from "./async-filesystem.interface";

/**
 * AI Safety Configuration
 */
export interface AISafetyConfig {
	// Path Security
	allowedPaths?: string[]; // Whitelist of allowed paths (if empty, all paths allowed except forbidden)
	forbiddenPaths?: string[]; // Blacklist of forbidden paths
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
		this.config = { ...DEFAULT_AI_CONFIG, ...config };
	}

	// ==========================================
	// AI SAFETY VALIDATION
	// ==========================================

	/**
	 * Normalize path to prevent traversal attacks
	 */
	private normalizePath(path: string): string {
		return path
			.replace(/\.\./g, "") // Remove .. patterns
			.replace(/\/+/g, "/") // Collapse multiple slashes
			.replace(/^\//, "") // Remove leading slash for relative comparison
			.replace(/\/$/, ""); // Remove trailing slash
	}

	/**
	 * Validate path is safe for AI access
	 */
	private validatePath(path: string): void {
		const normalizedPath = this.normalizePath(path);

		// Check for path traversal attempts in original path
		if (path.includes("../") || path.includes("..\\")) {
			throw new Error(`[AI-SAFETY] Path traversal attempt blocked: '${path}'`);
		}

		// Check against forbidden paths
		for (const forbidden of this.config.forbiddenPaths) {
			if (
				normalizedPath.startsWith(forbidden.replace(/^\//, "")) ||
				path.startsWith(forbidden)
			) {
				throw new Error(
					`[AI-SAFETY] Forbidden path access blocked: '${path}' (matches: ${forbidden})`,
				);
			}
		}

		// Check against allowed paths (if specified)
		if (this.config.allowedPaths.length > 0) {
			const isAllowed = this.config.allowedPaths.some(
				(allowed) =>
					normalizedPath.startsWith(allowed.replace(/^\//, "")) ||
					path.startsWith(allowed),
			);

			if (!isAllowed) {
				throw new Error(
					`[AI-SAFETY] Path not in allowlist: '${path}'. Allowed: ${this.config.allowedPaths.join(", ")}`,
				);
			}
		}

		// Check directory depth
		const depth = normalizedPath
			.split("/")
			.filter((segment) => segment.length > 0).length;
		if (depth > this.config.maxDepth) {
			throw new Error(
				`[AI-SAFETY] Path depth ${depth} exceeds maximum ${this.config.maxDepth}: '${path}'`,
			);
		}
	}

	/**
	 * Validate operation is allowed
	 */
	private validateOperation(operation: AIOperation): void {
		// Check read-only mode
		if (
			this.config.readOnly &&
			!["readFile", "exists", "readDir"].includes(operation)
		) {
			throw new Error(
				`[AI-SAFETY] Write operation '${operation}' blocked - filesystem is in read-only mode`,
			);
		}

		// Check allowed operations
		if (!this.config.allowedOperations.includes(operation)) {
			throw new Error(
				`[AI-SAFETY] Operation '${operation}' not allowed. Permitted: ${this.config.allowedOperations.join(", ")}`,
			);
		}
	}

	// ==========================================
	// AI-SAFE FILESYSTEM OPERATIONS
	// ==========================================

	async readFile(path: string): Promise<string> {
		this.validateOperation("readFile");
		this.validatePath(path);
		return this.baseFileSystem.readFile(path);
	}

	async writeFile(path: string, content: string): Promise<void> {
		this.validateOperation("writeFile");
		this.validatePath(path);
		return this.baseFileSystem.writeFile(path, content);
	}

	async exists(path: string): Promise<boolean> {
		this.validateOperation("exists");
		this.validatePath(path);
		return this.baseFileSystem.exists(path);
	}

	async deleteFile(path: string): Promise<void> {
		this.validateOperation("deleteFile");
		this.validatePath(path);
		return this.baseFileSystem.deleteFile(path);
	}

	async createDir(path: string): Promise<void> {
		this.validateOperation("ensureDir");
		this.validatePath(path);
		return this.baseFileSystem.ensureDir(path);
	}

	async ensureDir(path: string): Promise<void> {
		this.validateOperation("ensureDir");
		this.validatePath(path);
		return this.baseFileSystem.ensureDir(path);
	}

	async deleteDir(path: string): Promise<void> {
		this.validateOperation("deleteDir");
		this.validatePath(path);
		return this.baseFileSystem.deleteDir(path);
	}

	async chmod(path: string, mode: number): Promise<void> {
		this.validateOperation("chmod");
		this.validatePath(path);
		return this.baseFileSystem.chmod(path, mode);
	}

	async readDir(path: string): Promise<string[]> {
		this.validateOperation("readDir");
		this.validatePath(path);
		return this.baseFileSystem.readDir(path);
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
