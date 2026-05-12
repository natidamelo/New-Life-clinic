
const fs = require("fs");
const path = "frontend/src/components/doctor/ComprehensiveLabReport.tsx";
let content = fs.readFileSync(path, "utf8");

const startStr = "            {/* Separate urinalysis tests from other tests */}";
const endStr = "          </div>\n        )}\n      </div>\n\n      {/* Footer */}";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find start or end string.");
  process.exit(1);
}

const before = content.slice(0, startIndex);
const after = content.slice(endIndex);

const newContent = `            {/* Unified Table for all tests */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-sm font-bold text-gray-700 uppercase tracking-wider w-1/3">Test Name</th>
                      <th className="px-4 py-3 text-sm font-bold text-gray-700 uppercase tracking-wider">Result</th>
                      <th className="px-4 py-3 text-sm font-bold text-gray-700 uppercase tracking-wider">Normal Range</th>
                      <th className="px-4 py-3 text-sm font-bold text-gray-700 uppercase tracking-wider">Units</th>
                      <th className="px-4 py-3 text-sm font-bold text-gray-700 uppercase tracking-wider">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(() => {
                      // Group tests by category
                      const groupedTests = filteredTests.reduce((acc, test) => {
                        const cat = test.category || "General";
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(test);
                        return acc;
                      }, {});

                      // Define common unit map
                      const testUnitMap = {
                        "Glucose, Fasting": "mg/dL",
                        "Creatinine": "mg/dL",
                        "Urea": "mg/dL",
                        "Sodium": "mmol/L",
                        "Potassium": "mmol/L",
                        "Chloride": "mmol/L",
                        "Calcium": "mg/dL",
                        "Hemoglobin": "g/dL",
                        "White Blood Cell Count": "10^3/µL",
                        "Platelet Count": "10^3/µL",
                        "Hematocrit": "%",
                        "Cholesterol, Total": "mg/dL",
                        "Triglycerides": "mg/dL",
                        "HDL Cholesterol": "mg/dL",
                        "LDL Cholesterol": "mg/dL"
                      };

                      const calculateFlag = (value, normalRange) => {
                        const flag = determineFlag(value, normalRange);
                        let flagColor = "";
                        if (flag === "H") flagColor = "text-red-600";
                        else if (flag === "L") flagColor = "text-blue-600";
                        else if (flag === "N") flagColor = "text-emerald-600";
                        else flagColor = "text-gray-400";
                        return { flag, flagColor };
                      };

                      const FlagBadge = ({ flag }) => {
                        if (flag === "H") return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">H</span>;
                        if (flag === "L") return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">L</span>;
                        if (flag === "N") return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">N</span>;
                        if (flag === "A") return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200">A</span>;
                        return <span className="text-gray-400 text-sm">—</span>;
                      };

                      const ResultCell = ({ value }) => {
                        if (value === "See Reception") return <span className="text-blue-600 italic font-medium text-sm">{value}</span>;
                        if (value === "N/A") return <span className="text-gray-400 italic text-sm">{value}</span>;
                        if (value === "Pending") return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">{value}</span>;
                        return <span className="text-gray-800 font-semibold text-sm">{value}</span>;
                      };

                      // Helper to render rows for a specific test
                      const renderTestRows = (test, isStoolTest, defaultUnit) => {
                        const hasValidResults = test.results && (typeof test.results !== "undefined" && test.results !== null && (typeof test.results === "object" ? Object.keys(test.results).length > 0 : true));
                        
                        if (!hasValidResults) {
                          const defaultRows = createDefaultResults(test);
                          return defaultRows.map((row, idx) => {
                            const isAbnormal = row.flag === "H" || row.flag === "L" || row.flag === "A";
                            return (
                              <tr key={test._id + "-def-" + idx} className={\`\${isAbnormal ? "bg-red-50/40" : "bg-white"}\`}>
                                <td className="px-4 py-2.5 text-sm font-semibold text-gray-800 text-left">{row.paramName}</td>
                                <td className="px-4 py-2.5 text-left"><ResultCell value={row.resultValue} /></td>
                                <td className="px-4 py-2.5 text-sm text-left text-gray-500">{row.normalRange || "-"}</td>
                                <td className="px-4 py-2.5 text-sm text-left text-gray-500">{row.unit || "-"}</td>
                                <td className="px-4 py-2.5 text-left"><FlagBadge flag={row.flag} /></td>
                              </tr>
                            );
                          });
                        }

                        // CASE 1: Results is a direct value (string or number)
                        if (typeof test.results !== "object" && test.results && (typeof test.results === "string" || typeof test.results === "number")) {
                          const resultValue = test.results;
                          const normalRangeValue = test.normalRange || getSuggestedReferenceRange(test.testName);
                          let unit = normalRangeValue ? extractUnit(normalRangeValue) : defaultUnit;
                          if (unit === "-" && defaultUnit !== "-") unit = defaultUnit;
                          const cleanedRange = unit !== "-" ? cleanNormalRange(normalRangeValue, unit) : normalRangeValue;
                          const { flag, flagColor } = calculateFlag(resultValue, normalRangeValue);
                          const isAbnormal = flag === "H" || flag === "L" || flag === "A";
                          return (
                            <tr key={test._id + "-direct"} className={\`\${isAbnormal ? "bg-red-50/40" : "bg-white"}\`}>
                              <td className="px-4 py-2.5 text-sm font-semibold text-gray-800 text-left">{test.testName}</td>
                              <td className="px-4 py-2.5 text-left"><span className={\`font-bold text-sm \${flagColor}\`}>{resultValue}</span></td>
                              <td className="px-4 py-2.5 text-sm text-left text-gray-500">{cleanedRange || "-"}</td>
                              <td className="px-4 py-2.5 text-sm text-left text-gray-500">{unit || "-"}</td>
                              <td className="px-4 py-2.5 text-left"><FlagBadge flag={flag} /></td>
                            </tr>
                          );
                        }

                        // CASE STOOL: Parse semicolon-separated stool result string into rows
                        if (isStoolTest) {
                          let rawStr = "";
                          if (typeof test.results === "string") rawStr = test.results;
                          else if (typeof test.results === "object" && test.results !== null) {
                            rawStr = test.results.results || test.results.value || "";
                          }

                          const stoolNormals = {
                            "Colour":       { normal: "Brown", abnormal: ["Black", "Red", "Pale", "Yellow", "Green", "White"] },
                            "Consistency":  { normal: "Formed", abnormal: ["Loose", "Watery", "Hard", "Soft", "Mucoid"] },
                            "Mucus":        { normal: "Negative", abnormal: ["Positive", "+", "++", "+++"] },
                            "Blood":        { normal: "Negative", abnormal: ["Positive", "+", "++", "+++"] },
                            "Pus Cells":    { normal: "0 – 2 /HPF", abnormal: [] },
                            "RBC":          { normal: "Nil", abnormal: ["Positive", "+", "++", "+++"] },
                            "O/P":          { normal: "Negative", abnormal: ["Positive"] },
                            "Parasite":     { normal: "None", abnormal: [] },
                            "Fat Globules": { normal: "Not Seen", abnormal: ["Seen", "+", "++", "+++"] },
                          };

                          const getStoolFlag = (param, value) => {
                            const info = stoolNormals[param];
                            if (!info) return { flag: "", color: "text-gray-800" };
                            const v = value.trim();
                            if (v === info.normal) return { flag: "N", color: "text-emerald-700" };
                            if (info.abnormal && info.abnormal.length > 0) {
                              if (info.abnormal.some(a => v.toLowerCase() === a.toLowerCase())) return { flag: "A", color: "text-red-600" };
                            }
                            if (param === "Pus Cells") {
                              const n = parseFloat(v);
                              if (!isNaN(n) && n > 2) return { flag: "H", color: "text-red-600" };
                              if (!isNaN(n)) return { flag: "N", color: "text-emerald-700" };
                            }
                            return { flag: "", color: "text-gray-800" };
                          };

                          if (rawStr) {
                            const pairs = rawStr.split(";").map(s => s.trim()).filter(Boolean);
                            const rows = pairs.map(pair => {
                              const colonIdx = pair.indexOf(":");
                              if (colonIdx === -1) return { param: pair, value: "" };
                              return { param: pair.slice(0, colonIdx).trim(), value: pair.slice(colonIdx + 1).trim() };
                            }).filter(r => r.param && r.value !== undefined);

                            if (rows.length > 0) {
                              return rows.map((row, idx) => {
                                const normalInfo = stoolNormals[row.param];
                                const normalRange = normalInfo?.normal || "—";
                                const { flag, color } = getStoolFlag(row.param, row.value);
                                const isAbnormal = flag === "H" || flag === "A";
                                return (
                                  <tr key={test._id + "-stool-" + idx} className={\`\${isAbnormal ? "bg-red-50/40" : "bg-white"}\`}>
                                    <td className="px-4 py-2.5 text-sm font-semibold text-gray-800 text-left">{row.param}</td>
                                    <td className="px-4 py-2.5 text-left"><span className={\`font-bold text-sm \${color}\`}>{row.value || "—"}</span></td>
                                    <td className="px-4 py-2.5 text-sm text-left text-gray-500">{normalRange}</td>
                                    <td className="px-4 py-2.5 text-sm text-left text-gray-400">—</td>
                                    <td className="px-4 py-2.5 text-left"><FlagBadge flag={flag} /></td>
                                  </tr>
                                );
                              });
                            }
                          }
                        }

                        // CASE 2: Modern format with structured results object
                        if (test.results && typeof test.results === "object" && !Array.isArray(test.results)) {
                          const parameters = Object.entries(test.results)
                            .filter(([key]) => !["notes", "createdAt", "updatedAt", "id", "_id", "results", "normalRange"].includes(key))
                            .map(([key, value]) => {
                              if (typeof value === "object" && value !== null && "value" in value) {
                                let unit = value.unit || (value.normalRange ? extractUnit(value.normalRange) : defaultUnit);
                                if (unit === "-" && defaultUnit !== "-") unit = defaultUnit;
                                const whoRange = value.normalRange || getSuggestedReferenceRange(test.testName);
                                const cleanedRange = unit !== "-" && whoRange ? cleanNormalRange(whoRange, unit) : whoRange || "-";
                                const { flag, flagColor } = calculateFlag(value.value, whoRange);
                                return { paramName: key, resultValue: value.value, unit, normalRange: cleanedRange, flag, flagColor };
                              } else {
                                let unit = test.normalRange ? extractUnit(test.normalRange) : defaultUnit;
                                if (unit === "-" && defaultUnit !== "-") unit = defaultUnit;
                                const whoRange = test.normalRange || getSuggestedReferenceRange(test.testName);
                                const cleanedRange = unit !== "-" && whoRange ? cleanNormalRange(whoRange, unit) : whoRange || "-";
                                const { flag, flagColor } = calculateFlag(value, whoRange);
                                return { paramName: key, resultValue: value, unit, normalRange: cleanedRange, flag, flagColor };
                              }
                            });
                          
                          if (parameters.length > 0) {
                            return parameters.map((param, idx) => {
                              const isAbnormal = param.flag === "H" || param.flag === "L" || param.flag === "A";
                              return (
                                <tr key={test._id + "-param-" + idx} className={\`\${isAbnormal ? "bg-red-50/40" : "bg-white"}\`}>
                                  <td className="px-4 py-2.5 text-sm font-semibold text-gray-800 text-left">{param.paramName}</td>
                                  <td className="px-4 py-2.5 text-left"><span className={\`font-bold text-sm \${param.flagColor}\`}>{String(param.resultValue)}</span></td>
                                  <td className="px-4 py-2.5 text-sm text-left text-gray-500">{param.normalRange || "-"}</td>
                                  <td className="px-4 py-2.5 text-sm text-left text-gray-500">{param.unit || "-"}</td>
                                  <td className="px-4 py-2.5 text-left"><FlagBadge flag={param.flag} /></td>
                                </tr>
                              );
                            });
                          }
                        }

                        // CASE 4: Default fallback
                        const defaultRows2 = createDefaultResults(test);
                        return defaultRows2.map((row, idx) => {
                          const isAbnormal = row.flag === "H" || row.flag === "L" || row.flag === "A";
                          return (
                            <tr key={test._id + "-def2-" + idx} className={\`\${isAbnormal ? "bg-red-50/40" : "bg-white"}\`}>
                              <td className="px-4 py-2.5 text-sm font-semibold text-gray-800 text-left">{row.paramName}</td>
                              <td className="px-4 py-2.5 text-left"><ResultCell value={row.resultValue} /></td>
                              <td className="px-4 py-2.5 text-sm text-left text-gray-500">{row.normalRange || "-"}</td>
                              <td className="px-4 py-2.5 text-sm text-left text-gray-500">{row.unit || "-"}</td>
                              <td className="px-4 py-2.5 text-left"><FlagBadge flag={row.flag} /></td>
                            </tr>
                          );
                        });
                      };

                      return Object.entries(groupedTests).map(([category, tests]) => {
                        return (
                          <React.Fragment key={category}>
                            {/* Category Header Row */}
                            <tr className="bg-gray-100">
                              <td colSpan={5} className="px-4 py-2 text-sm font-extrabold text-gray-800 uppercase tracking-widest border-y border-gray-300">
                                {category}
                              </td>
                            </tr>
                            
                            {/* Tests in Category */}
                            {tests.map(test => {
                              const isStoolTest = test.testName?.toLowerCase().includes("stool") || test.testName?.toLowerCase().includes("fecal") || test.testName?.toLowerCase().includes("faecal");
                              const defaultUnit = testUnitMap[test.testName] || "-";
                              return renderTestRows(test, isStoolTest, defaultUnit);
                            })}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              
              {/* Pathologist Comments & Footer */}
              <div className="mt-8 border-t border-gray-200 pt-6 px-6 pb-6">
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-gray-800 mb-2 border-b border-gray-100 pb-1">Pathologist Comments</h4>
                  <p className="text-sm text-gray-600 italic">No specific comments provided for these results.</p>
                </div>
                <div className="flex justify-end mt-8">
                  <div className="text-center">
                    <div className="h-12 border-b border-gray-300 w-48 mb-2 flex items-center justify-center">
                      <span className="text-gray-300 italic text-xs">Digital Signature</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800">Digitally signed by: {patientResults.verifiedBy || patientResults.physician || "Dr. Assigned"}</p>
                    <p className="text-xs text-gray-500">Pathologist / Lab Director</p>
                  </div>
                </div>
              </div>
            </div>
`;

fs.writeFileSync(path, before + newContent + after);
console.log("Replaced successfully!");
