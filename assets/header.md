<!-- Sidebar -->
<nav class="navbar navbar-dark navbar-expand-xl shadow" id="homie" style="background-color: rgba(0, 0, 0, 0.5)">

:::::: container-fluid
[![PlanEATary Logo](./images/transparent_logo.png){.d-inline-block .align-text-top
height="80px" width="auto"}](/){.navbar-brand .d-flex
.align-items-center}
<button class="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasNavbar" aria-controls="offcanvasNavbar">
[]{.navbar-toggler-icon}
</button>

::::: {#offcanvasNavbar .offcanvas .offcanvas-end tabindex="-1" aria-labelledby="offcanvasNavbarLabel" style="background-image: linear-gradient(rgba(0, 0, 0, 0.7) 20%, #00af8c), url(\"./images/vegetables.png\"); background-size: cover"}
::: offcanvas-header
##### ![](./images/transparent_logo.png){.d-inline-block .align-text-top height="75px" width="auto"} {#offcanvasNavbarLabel .offcanvas-title .d-flex .align-items-center .text-white}

<button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close" id="offcanvasCloseButton" autofocus>
</button>
:::

::: offcanvas-body
- [Home](/){.nav-link .active aria-current="page" bs-dismiss="offcanvas"
  style="text-decoration: underline white"}

- [**Quiz**](#){.nav-link .dropdown-toggle role="button"
  bs-toggle="dropdown" aria-expanded="false"}
  - [Pre-quiz](/qualtrics){.dropdown-item bs-dismiss="offcanvas"}
  - [Post-quiz](/qualtrics_post){.dropdown-item .first-timer
    aria-disabled="false" bs-dismiss="offcanvas"}

- [Challenge](/manifesto_page){#navChallenge .nav-link .first-timer
  aria-disabled="false" bs-dismiss="offcanvas"}

- [Dashboard](/result_page){.nav-link .first-timer
  aria-disabled="false" bs-dismiss="offcanvas"}

- [History](/history_page){.nav-link .first-timer aria-disabled="false"
  bs-dismiss="offcanvas"}

- [User](#){.nav-link .dropdown-toggle role="button"
  bs-toggle="dropdown" aria-expanded="false"}
  - [My account](account%20manage.html){.dropdown-item
    bs-dismiss="offcanvas"}
  - [Log out]{#logOut .dropdown-item}

- <button type="button" class="btn btn-success" style="width: 150px" data-bs-toggle="modal" data-bs-target="#signInModal" id="signIn">
  Sign in
  </button>

- <button type="button" class="btn btn-primary" style="width: 150px" data-bs-toggle="modal" data-bs-target="#signUpModal" id="signUp">
  Sign up
  </button>
:::
:::::
::::::

</nav>
