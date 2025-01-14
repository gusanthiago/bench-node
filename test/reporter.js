const { describe, it, before } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");

const {
	Suite,
	chartReport,
	htmlReport,
	jsonReport,
	csvReport,
} = require("../lib");

describe("chartReport outputs benchmark results as a bar chart", async (t) => {
	let output = "";

	before(async () => {
		const originalStdoutWrite = process.stdout.write;
		process.stdout.write = (data) => {
			output += data;
		};

		const suite = new Suite({
			reporter: chartReport,
		});

		suite
			.add("single with matcher", () => {
				const pattern = /[123]/g;
				const replacements = { 1: "a", 2: "b", 3: "c" };
				const subject = "123123123123123123123123123123123123123123123123";
				const r = subject.replace(pattern, (m) => replacements[m]);
				assert.ok(r);
			})
			.add("multiple replaces", () => {
				const subject = "123123123123123123123123123123123123123123123123";
				const r = subject
					.replace(/1/g, "a")
					.replace(/2/g, "b")
					.replace(/3/g, "c");
				assert.ok(r);
			});
		await suite.run();

		process.stdout.write = originalStdoutWrite;
	});

	it("should include bar chart chars", () => {
		assert.ok(output.includes("█"));
	});

	it("should include ops/sec", () => {
		assert.ok(output.includes("ops/sec"));
	});

	it("should include benchmark names", () => {
		assert.ok(output.includes("single with matcher"));
		assert.ok(output.includes("multiple replaces"));
	});

	it("should include sample count", () => {
		assert.ok(output.includes("samples"));
	});
});

describe("htmlReport should create a file", async (t) => {
	let output = "";
	let htmlName = "";
	let htmlContent = "";

	before(async () => {
		const originalStdoutWrite = process.stdout.write;
		const originalWriteFileSync = fs.writeFileSync;

		fs.writeFileSync = (name, content) => {
			htmlName = name;
			htmlContent = content;
		};

		process.stdout.write = (data) => {
			output += data;
		};

		const suite = new Suite({
			reporter: htmlReport,
		});

		suite
			.add("single with matcher", () => {
				const pattern = /[123]/g;
				const replacements = { 1: "a", 2: "b", 3: "c" };
				const subject = "123123123123123123123123123123123123123123123123";
				const r = subject.replace(pattern, (m) => replacements[m]);
				assert.ok(r);
			})
			.add("Multiple replaces", () => {
				const subject = "123123123123123123123123123123123123123123123123";
				const r = subject
					.replace(/1/g, "a")
					.replace(/2/g, "b")
					.replace(/3/g, "c");
				assert.ok(r);
			});
		await suite.run();

		fs.writeFileSync = originalWriteFileSync;
		process.stdout.write = originalStdoutWrite;
	});

	it("should print that a HTML file has been generated", () => {
		assert.ok(output.includes("HTML file has been generated"));
	});

	it("htmlName should be result.html", () => {
		assert.strictEqual(htmlName, "result.html");
	});

	it("htmlContent should not be empty", () => {
		assert.ok(htmlContent.length > 100);
	});

	it("htmlContent bench suite should be used as class name", () => {
		assert.ok(htmlContent.includes("circle-Multiple-replaces"));
		assert.ok(htmlContent.includes("circle-single-with-matcher"));
	});

	it("htmlContent should not contain replace tags {{}}", () => {
		assert.ok(htmlContent.includes("{{") === false);
		assert.ok(htmlContent.includes("}}") === false);
	});
});

describe("jsonReport should produce valid JSON output", async () => {
	let output = "";

	before(async () => {
		const originalStdoutWrite = process.stdout.write;
		process.stdout.write = (data) => {
			output += data;
		};

		// Create a new Suite with the JSON reporter
		const suite = new Suite({
			reporter: jsonReport,
		});

		suite
			.add("single with matcher", () => {
				const pattern = /[123]/g;
				const replacements = { 1: "a", 2: "b", 3: "c" };
				const subject = "123123123123123123123123123123123123123123123123";
				const r = subject.replace(pattern, (m) => replacements[m]);
				assert.ok(r);
			})
			.add("Multiple replaces", () => {
				const subject = "123123123123123123123123123123123123123123123123";
				const r = subject
					.replace(/1/g, "a")
					.replace(/2/g, "b")
					.replace(/3/g, "c");
				assert.ok(r);
			});

		// Run the suite
		await suite.run();

		// Restore stdout
		process.stdout.write = originalStdoutWrite;
	});

	it("should print valid JSON", () => {
		// Verify if the output can be parsed as JSON
		let data;
		try {
			data = JSON.parse(output);
		} catch (err) {
			assert.fail(`Output is not valid JSON: ${err.message}`);
		}

		assert.ok(Array.isArray(data), "Output should be an array of results");
	});

	it("should contain the required benchmark fields", () => {
		const data = JSON.parse(output);

		// We expect the two benchmarks we added: 'single with matcher' and 'Multiple replaces'
		assert.strictEqual(data.length, 2, "Should have results for 2 benchmarks");

		for (const entry of data) {
			// Ensure each entry has expected keys
			assert.ok(typeof entry.name === "string", "name should be a string");
			assert.ok(typeof entry.opsSec === "number", "opsSec should be a number");
			assert.ok(
				typeof entry.runsSampled === "number",
				"runsSampled should be a number",
			);
			assert.ok(
				typeof entry.min === "string",
				"min should be a string (formatted time)",
			);
			assert.ok(
				typeof entry.max === "string",
				"max should be a string (formatted time)",
			);
			assert.ok(Array.isArray(entry.plugins), "plugins should be an array");
		}
	});
});

describe("csvReport", () => {
	it("should generate valid CSV output", async (t) => {
		const fn = t.mock.method(process.stdout, "write");

		// noop
		fn.mock.mockImplementation(() => {});

		csvReport([
			{
				opsSec: 749625.5652171721,
				iterations: 374813,
				histogram: {
					samples: 10,
					min: 1322.2615873857162,
					max: 1345.4275821344213,
				},
				name: "single with matcher",
				plugins: [
					{
						name: "V8NeverOptimizePlugin",
						result: "enabled",
						report: "v8-never-optimize=true",
					},
				],
			},
			{
				opsSec: 634284.7401772924,
				iterations: 317148,
				histogram: {
					samples: 11,
					min: 1552.562466504839,
					max: 1612.7852084972462,
				},
				name: "Multiple replaces",
				plugins: [
					{
						name: "V8NeverOptimizePlugin",
						result: "enabled",
						report: "v8-never-optimize=true",
					},
				],
			},
		]);

		const callArgs = process.stdout.write.mock.calls.map(
			(call) => call.arguments[0],
		);

		assert.strictEqual(process.stdout.write.mock.callCount(), 13);
		assert.deepStrictEqual(callArgs, [
			"name,ops/sec,samples,plugins,min,max\n",
			"single with matcher,",
			'"749,626",',
			"10,",
			'"v8-never-optimize=true",',
			"1.32us,",
			"1.35us\n",
			"Multiple replaces,",
			'"634,285",',
			"11,",
			'"v8-never-optimize=true",',
			"1.55us,",
			"1.61us\n",
		]);
	});
});
