// TODO: This is a test file to demonstrate lint rules
// FIXME: Remove this later

export function testFunction() {
  // Removed console.log and console.warn - commit will succeed now
  console.error("This is allowed"); // This is OK
  console.info("This is allowed too"); // This is OK

  // HACK: Testing warning comments
  const x = 5;
  return x;
}
