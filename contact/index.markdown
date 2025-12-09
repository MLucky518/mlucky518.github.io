---
layout: default
title: Contact
permalink: /contact/
---

<div class="contact-page">
  <div class="contact-header">
    <h1>Get in Touch</h1>
    <p>Have a question, want to collaborate, or just want to say hi? Drop me a message!</p>
  </div>

  <div class="contact-content">
    <div class="contact-info">
      <div class="contact-item">
        <span class="contact-label">Email</span>
        <a href="mailto:{{ site.email }}">{{ site.email }}</a>
      </div>
      <div class="contact-item">
        <span class="contact-label">GitHub</span>
        <a href="https://github.com/{{ site.github_username }}" target="_blank">@{{ site.github_username }}</a>
      </div>
      <div class="contact-item">
        <span class="contact-label">Twitter</span>
        <a href="https://twitter.com/{{ site.twitter_username }}" target="_blank">@{{ site.twitter_username }}</a>
      </div>
    </div>

    <div class="contact-note">
      <p>🤖 <strong>Coming Soon:</strong> An AI-powered chat assistant to help answer your questions!</p>
    </div>
  </div>
</div>
