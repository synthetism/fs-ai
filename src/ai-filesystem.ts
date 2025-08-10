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
		// Merge configuration with proper array handling
		this.config = {
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
	 * Normalize path to prevent traversal attacks
	 */
	private normalizePath(path: string): string {
		// Split path into segments and resolve .. patterns
		const segments = path
			.split("/")
			.filter((segment) => segment !== "" && segment !== ".");
		const resolved: string[] = [];

		for (const segment of segments) {
			if (segment === "..") {
				resolved.pop(); // Go up one level
			} else {
				resolved.push(segment);
			}
		}

		// Join back and ensure consistent format
		const result = resolved.join("/");
		return path.startsWith("./") ? `./${result}` : result;
	}

	/**
	 * Validate path is safe for AI access
	 */
	private validatePath(path: string): void {
		const normalizedPath = this.normalizePath(path);

		// First, check for malicious path traversal that goes outside safe bounds
		if (path.includes("../") || path.includes("..\\")) {
			// If we have allowedPaths, check if the normalized result stays within bounds
			if (this.config.allowedPaths.length > 0) {
				const staysWithinAllowed = this.config.allowedPaths.some((allowed) => {
					const normalizedAllowed = this.normalizePath(allowed);
					const cleanPath = normalizedPath.replace(/^\.\//, "");
					const cleanAllowed = normalizedAllowed.replace(/^\.\//, "");
					return cleanPath.startsWith(cleanAllowed);
				});

				if (!staysWithinAllowed) {
					throw new Error("Path not allowed");
				}
			} else {
				// No allowedPaths means we only check forbidden paths
				// But if the normalized path would escape the current directory context, block it
				if (normalizedPath.startsWith("../") || normalizedPath === "..") {
					throw new Error("Path not allowed");
				}
			}
		}

		// Check against forbidden paths (using both original and normalized)
		for (const forbidden of this.config.forbiddenPaths) {
			const cleanForbidden = forbidden.replace(/^\//, "");
			const cleanNormalized = normalizedPath.replace(/^\.\//, "");
			const cleanOriginal = path.replace(/^\.\//, "");

			if (
				cleanNormalized.startsWith(cleanForbidden) ||
				cleanOriginal.startsWith(cleanForbidden) ||
				normalizedPath.startsWith(forbidden) ||
				path.startsWith(forbidden)
			) {
				throw new Error("Path not allowed");
			}
		}

		// Check against allowed paths (if specified)
		if (this.config.allowedPaths.length > 0) {
			const isAllowed = this.config.allowedPaths.some((allowed) => {
				// Normalize the allowed path for comparison
				const normalizedAllowed = this.normalizePath(allowed);

				// Clean both paths for comparison (remove leading ./)
				const cleanPath = normalizedPath.replace(/^\.\//, "");
				const cleanAllowed = normalizedAllowed.replace(/^\.\//, "");

				// Check various combinations to be thorough
				return (
					cleanPath.startsWith(cleanAllowed) ||
					normalizedPath.startsWith(normalizedAllowed) ||
					normalizedPath.startsWith(allowed) ||
					path.startsWith(allowed)
				);
			});

			if (!isAllowed) {
				throw new Error("Path not allowed");
			}
		}

		// Check directory depth (use normalized path for accurate count)
		const cleanPath = normalizedPath.replace(/^\.\//, "");
		const depth =
			cleanPath === ""
				? 0
				: cleanPath.split("/").filter((segment) => segment.length > 0).length;
		if (depth > this.config.maxDepth) {
			throw new Error("Path exceeds maximum depth");
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
