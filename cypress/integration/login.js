describe("Login test", () => {
  const login = {
    email: "a@a.com",
    password: "a"
  };
  before(() => {
    // cy.exec("cd ../..");
    // cy.exec("yarn run devserver");
    // cy.exec("npm run flush");
  });
  it("should be able to log in", () => {
    cy.visit("/");
    cy
      .get('input[name="username"]')
      .type(login.email)
      .should("have.value", login.email);
    cy
      .get('input[name="password"]')
      .type(login.password)
      .should("have.value", login.password);
    cy.get("form").submit();
  });
  // more tests here
});
