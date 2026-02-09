import React from "react";

const UserCard = ({ icon, title, description, benefits, color }) => (
  <div className="group relative bg-white rounded-2xl overflow-hidden shadow-lg shadow-primary/5 border border-primary/10 hover:shadow-xl transition-all duration-300">
    <div className={`h-2 ${color}`} />

    <div className="p-6 sm:p-7">
      <div
        className={`w-14 h-14 sm:w-16 sm:h-16 ${color}/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
      >
        {icon}
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-foreground/70 mb-4">
        {description}
      </p>

      <ul className="space-y-2">
        {benefits.map((benefit, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-sm text-foreground/80"
          >
            <svg
              className="w-4 h-4 text-secondary shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            {benefit}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

const TargetUsers = () => {
  const users = [
    {
      icon: (
        <svg
          className="w-8 h-8 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
      title: "Government Officials",
      description: "Urban management, utilities, and public works teams.",
      benefits: [
        "Real-time issue monitoring",
        "Priority-based task allocation",
        "Performance analytics",
        "Interdepartment coordination",
      ],
      color: "bg-primary",
    },
    {
      icon: (
        <svg
          className="w-8 h-8 text-accent"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      title: "Citizens",
      description: "Residents who report and track complaints transparently.",
      benefits: [
        "Easy multi-channel reporting",
        "Real-time status tracking",
        "Transparent resolution process",
        "Voice in city improvement",
      ],
      color: "bg-accent",
    },
  ];

  return (
    <section id="users" className="py-20 md:py-32 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            Platform Users
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Who Uses{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-secondary">
              CivicLens
            </span>
          </h2>

          <p className="text-base sm:text-lg text-foreground/70">
            The platform serves key user groups with tailored features.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {users.map((user, index) => (
            <UserCard key={index} {...user} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TargetUsers;
