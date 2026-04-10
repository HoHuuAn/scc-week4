const { add, subtract, multiply, divide } = require('./app');

describe('Calculator', () => {
  test('adds two numbers', () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
  });

  test('subtracts two numbers', () => {
    expect(subtract(5, 3)).toBe(2);
    expect(subtract(0, 5)).toBe(-5);
  });

  test('multiplies two numbers', () => {
    expect(multiply(4, 3)).toBe(12);
    expect(multiply(-2, 3)).toBe(-6);
  });

  test('divides two numbers', () => {
    expect(divide(10, 2)).toBe(5);
    expect(divide(9, 3)).toBe(3);
  });

  test('throws error on division by zero', () => {
    expect(() => divide(5, 0)).toThrow('Division by zero');
  });
});
