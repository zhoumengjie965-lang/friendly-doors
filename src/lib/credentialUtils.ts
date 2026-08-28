const pick = (characters: string) => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return characters[values[0] % characters.length];
};

export function generateRandomPassword(length = 14) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const password = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (password.length < length) password.push(pick(all));

  for (let index = password.length - 1; index > 0; index -= 1) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const target = values[0] % (index + 1);
    [password[index], password[target]] = [password[target], password[index]];
  }
  return password.join("");
}
