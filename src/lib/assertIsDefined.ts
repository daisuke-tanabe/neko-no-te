function assertIsDefined<T>(args: T): asserts args is NonNullable<T> {
  if (args === undefined || args === null) {
    throw new Error(
      `Expected 'val' to be defined, but received ${args}`,
    );
  }
}

export default assertIsDefined;
