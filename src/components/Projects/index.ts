import Vue from "vue";
import { Component, Inject, Model, Prop, Watch } from "vue-property-decorator";
import * as distanceInWordsToNow from "date-fns/distance_in_words_to_now";

import { Config } from "../../types/config";

// Typings for modules imported dynamically
import FirebaseAppModule = require("firebase/app");

// Include automock for automated mocking
import "../../automock";

type Section = {
  content: String;
  name: String;
  id: String;
  ref: String;
};

declare const hljs: any;

@Component
export default class Projects extends Vue {
  name = "projects";
  required = {
    firebase: FirebaseAppModule
  };
  sections: Section[] = [];
  header: Section = { content: "", name: "", id: "", ref: "" };
  config: Config = {};
  is_subpage = false;

  async mounted() {
    await Promise.all([
      System.import("firebase"),
      System.import("isomorphic-fetch")
    ]);

    this.required.firebase = <typeof FirebaseAppModule>require("firebase/app");
    require("firebase/firestore");
    require("isomorphic-fetch");

    const config = await fetch("/__/firebase/init.json").then(response =>
      response.json()
    );

    this.required.firebase.initializeApp(config);

    const blocked_sections = ["table of contents"];

    const id = [
      this.$route.params.organization,
      this.$route.params.repository
    ].join("::");

    const repoDoc = this.required.firebase
      .firestore()
      .collection("content")
      .doc(id);

    const page = this.$route.params.page;

    let dataDoc;
    if (page) {
      let page_id = page.split("/").join("::");

      if (!page_id.endsWith(".md")) {
        page_id += ".md";
      }

      dataDoc = repoDoc.collection("pages").doc(page_id);
      this.is_subpage = true;
    } else {
      dataDoc = repoDoc;
    }

    const snapshot = await dataDoc.get();

    const data = snapshot.data();

    this.header = data.header as Section;
    this.page_title = data.header.name;
    const sections = snapshot.data().sections as Section[];

    sections.forEach(section => {
      if (blocked_sections.indexOf(section.name.toLowerCase()) != -1) return;
      section.id = this.as_id(section.name);
      section.ref = "#" + section.id;
      this.sections.push(section);
    });

    const configSnapshot = await this.required.firebase
      .firestore()
      .collection("configs")
      .doc(id)
      .get();

    this.config = configSnapshot.data() as Config;
    this.config.last_updated_from_now = distanceInWordsToNow(
      this.config.last_updated
    );
  }

  as_id(text: String) {
    return text.toLowerCase().replace(" ", "_");
  }

  set page_title(page_title: string) {
    document.querySelector("title").innerText = page_title;
  }

  updated() {
    document.querySelectorAll("pre code").forEach(function(el) {
      hljs.highlightBlock(el);
    });
  }
}

require("./template.html")(Projects);